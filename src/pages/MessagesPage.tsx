import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Search, Send, ChevronLeft, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/home/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

interface ConversationPartner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarCollapsed] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<ConversationPartner | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations with profile info
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by partner
      const partnerMap = new Map<string, any>();
      messages?.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unread: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
          });
        } else if (msg.receiver_id === user.id && !msg.is_read) {
          partnerMap.get(partnerId).unread++;
        }
      });

      // Fetch profiles
      const partnerIds = Array.from(partnerMap.keys());
      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, headline")
        .in("user_id", partnerIds);

      return partnerIds.map((pid) => {
        const profile = profiles?.find((p) => p.user_id === pid);
        const info = partnerMap.get(pid);
        return {
          id: pid,
          full_name: profile?.full_name || "User",
          avatar_url: profile?.avatar_url,
          headline: profile?.headline,
          ...info,
        } as ConversationPartner;
      });
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Fetch chat messages for selected partner
  const { data: chatMessages } = useQuery({
    queryKey: ["chat-messages", user?.id, selectedPartner?.id],
    queryFn: async () => {
      if (!user || !selectedPartner) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedPartner.id}),and(sender_id.eq.${selectedPartner.id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", selectedPartner.id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      return data;
    },
    enabled: !!user && !!selectedPartner,
    refetchInterval: 3000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });

          // Desktop notification
          if (msg.receiver_id === user.id && document.hidden && Notification.permission === "granted") {
            new Notification("New Message", { body: msg.content.slice(0, 50) });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !selectedPartner || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPartner.id,
        content: messageText.trim(),
      });
      if (error) throw error;
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err: any) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  const filteredConversations = conversations?.filter(
    (c) => !searchQuery || c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar isCollapsed={sidebarCollapsed} />

      <main className={cn("transition-all duration-300 pt-16", "lg:ml-64", sidebarCollapsed && "lg:ml-16")}>
        <div className="h-[calc(100vh-4rem)]">
          <div className="grid lg:grid-cols-3 h-full border-x">
            {/* Conversations List */}
            <div className={cn("border-r flex flex-col", selectedPartner && "hidden lg:flex")}>
              <div className="p-4 border-b">
                <h2 className="font-bold text-lg mb-3">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 rounded-lg" />))}
                  </div>
                ) : filteredConversations && filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedPartner(conv)}
                        className={cn(
                          "w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left",
                          selectedPartner?.id === conv.id && "bg-muted"
                        )}
                      >
                        <Avatar>
                          <AvatarImage src={conv.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">{getInitials(conv.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate text-sm">{conv.full_name}</h3>
                            <span className="text-xs text-muted-foreground">{formatMessageTime(conv.lastMessageTime)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                        {conv.unread > 0 && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{conv.unread}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Connect with people to start chatting</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className={cn("lg:col-span-2 flex flex-col", !selectedPartner && "hidden lg:flex")}>
              {selectedPartner ? (
                <>
                  <div className="p-4 border-b flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedPartner(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar>
                      <AvatarImage src={selectedPartner.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedPartner.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedPartner.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedPartner.headline || "PlacementHub User"}</p>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {chatMessages?.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-2", msg.sender_id === user?.id && "justify-end")}>
                          {msg.sender_id !== user?.id && (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={selectedPartner.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(selectedPartner.full_name)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted rounded-bl-none"
                          )}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={cn("text-[10px] mt-1", msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!messageText.trim() || sending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-1">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground">Choose a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;

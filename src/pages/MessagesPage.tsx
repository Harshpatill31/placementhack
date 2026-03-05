import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Search, Send, ArrowLeft, Smile, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ConversationPartner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

const EMOJI_LIST = ["😀","😂","😍","🥰","😎","🤩","🙌","👍","❤️","🔥","💯","🎉","👏","💪","✨","🤝","😊","🥳","😇","🤗","😘","💕","🌟","⭐","🚀","💼","📚","🎯","✅","💬"];

const MessagesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<ConversationPartner | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch accepted connections first
  const { data: connectedUserIds } = useQuery({
    queryKey: ["connected-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (error) throw error;
      return data?.map((c) => c.requester_id === user.id ? c.addressee_id : c.requester_id) || [];
    },
    enabled: !!user,
  });

  // Fetch conversations only with connected users
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id, connectedUserIds],
    queryFn: async () => {
      if (!user || !connectedUserIds?.length) return [];
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const partnerMap = new Map<string, any>();
      messages?.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!connectedUserIds.includes(partnerId)) return;
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

      // Also add connected users without messages
      connectedUserIds.forEach((id) => {
        if (!partnerMap.has(id)) {
          partnerMap.set(id, { lastMessage: "Start a conversation", lastMessageTime: new Date().toISOString(), unread: 0 });
        }
      });

      const partnerIds = Array.from(partnerMap.keys());
      if (partnerIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, headline")
        .in("user_id", partnerIds);

      return partnerIds.map((pid) => {
        const profile = profiles?.find((p) => p.user_id === pid);
        const info = partnerMap.get(pid);
        return { id: pid, full_name: profile?.full_name || "User", avatar_url: profile?.avatar_url, headline: profile?.headline, ...info } as ConversationPartner;
      }).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    },
    enabled: !!user && !!connectedUserIds,
    refetchInterval: 5000,
  });

  const { data: chatMessages } = useQuery({
    queryKey: ["chat-messages", user?.id, selectedPartner?.id],
    queryFn: async () => {
      if (!user || !selectedPartner) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedPartner.id}),and(sender_id.eq.${selectedPartner.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedPartner.id).eq("receiver_id", user.id).eq("is_read", false);
      return data;
    },
    enabled: !!user && !!selectedPartner,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
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

  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !user || !selectedPartner || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPartner.id,
        content: messageText.trim(),
      });
      if (error) throw error;
      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedPartner.id,
        type: "message",
        title: "New Message",
        message: `You have a new message`,
        link: "/messages",
      });
      setMessageText("");
      inputRef.current?.focus();
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [messageText, user, selectedPartner, sending, queryClient]);

  const addEmoji = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    inputRef.current?.focus();
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
      <MobileNav />

      <main className="pt-16 pb-16 md:pb-0 md:ml-64">
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
          <div className="grid md:grid-cols-3 h-full border-x">
            {/* Conversations List */}
            <div className={cn("border-r flex flex-col", selectedPartner && "hidden md:flex")}>
              <div className="p-3 md:p-4 border-b">
                <h2 className="font-bold text-lg mb-2">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-3 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                  </div>
                ) : filteredConversations && filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedPartner(conv)}
                        className={cn(
                          "w-full p-3 md:p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left active:bg-muted/80",
                          selectedPartner?.id === conv.id && "bg-muted"
                        )}
                      >
                        <Avatar className="h-10 w-10 md:h-11 md:w-11">
                          <AvatarImage src={conv.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(conv.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate text-sm">{conv.full_name}</h3>
                            <span className="text-[11px] text-muted-foreground ml-2 shrink-0">{formatMessageTime(conv.lastMessageTime)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                        </div>
                        {conv.unread > 0 && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">{conv.unread}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">No connections yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Connect with people to start chatting</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className={cn("md:col-span-2 flex flex-col", !selectedPartner && "hidden md:flex")}>
              {selectedPartner ? (
                <>
                  <div className="p-3 md:p-4 border-b flex items-center gap-3 bg-card">
                    <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={() => setSelectedPartner(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedPartner.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(selectedPartner.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{selectedPartner.full_name}</h3>
                      <p className="text-[11px] text-muted-foreground truncate">{selectedPartner.headline || "PlacementHub User"}</p>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-3 md:p-4">
                    <div className="space-y-2.5">
                      {chatMessages?.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-2", msg.sender_id === user?.id && "justify-end")}>
                          {msg.sender_id !== user?.id && (
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={selectedPartner.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getInitials(selectedPartner.full_name)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2",
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}>
                            <p className="text-sm break-words">{msg.content}</p>
                            <p className={cn("text-[10px] mt-0.5", msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-2.5 md:p-4 border-t bg-card">
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-1.5 md:gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                            <Smile className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" side="top" align="start">
                          <div className="grid grid-cols-6 gap-1">
                            {EMOJI_LIST.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        ref={inputRef}
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="flex-1 h-9 md:h-10"
                      />
                      <Button type="submit" disabled={!messageText.trim() || sending} size="icon" className="shrink-0 h-9 w-9 md:h-10 md:w-10">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-1">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground">Choose a connection to start chatting</p>
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

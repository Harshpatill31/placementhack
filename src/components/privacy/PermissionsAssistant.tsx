import { useState } from "react";
import { Bot, Check, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const starterQuestions = [
  "Who can see my profile and portfolio?",
  "Can an accepted connection see my applications?",
  "Why can a company view my resume?",
];

const parseError = (body: string) => {
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    return parsed.error || parsed.message || body;
  } catch {
    return body;
  }
};

const PermissionsAssistant = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const askQuestion = async (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again to use the privacy assistant.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-permissions-assistant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok) {
        throw new Error(parseError(await response.text()) || "The privacy assistant could not respond.");
      }
      if (!response.body) throw new Error("The privacy assistant returned no response.");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let answer = "";
      let reasoning = "";

      const appendEvent = (rawEvent: string) => {
        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) return;
        const payloadText = dataLine.slice(5).trim();
        if (!payloadText || payloadText === "[DONE]") return;
        try {
          const payload = JSON.parse(payloadText) as {
            type?: string;
            delta?: string;
            text?: string;
            response?: { output_text?: string };
          };
          if (payload.type === "response.output_text.delta") answer += payload.delta || "";
          if (payload.type === "response.reasoning_summary_text.delta") reasoning += payload.delta || "";
          if (payload.type === "response.completed" && !answer) {
            answer = payload.response?.output_text || "";
          }
        } catch {
          // Ignore keep-alive or incomplete SSE frames.
        }
      };

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += chunk;
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach(appendEvent);
      }
      if (buffer.trim()) appendEvent(buffer);

      const assistantText = answer.trim() || reasoning.trim() || "I couldn't find an explanation for that question.";
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: assistantText,
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: error instanceof Error ? error.message : "The privacy assistant could not respond. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b bg-primary/5 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Privacy assistant
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                <Check className="h-3 w-3" /> Secure
              </span>
            </CardTitle>
            <CardDescription className="mt-1">
              Ask who can view your profile, resume, or job applications and why.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">I explain the visibility rules without accessing or displaying your private records.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {starterQuestions.map((starter) => (
                <Button key={starter} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => askQuestion(starter)}>
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex items-start gap-3", message.role === "user" && "justify-end")}>
                {message.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0 text-primary" />}
                <div className={cn(
                  "max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}>
                  {message.content}
                </div>
                {message.role === "user" && <UserRound className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking the access rules…
              </div>
            )}
          </div>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void askQuestion();
          }}
        >
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a privacy question…"
            aria-label="Ask the privacy assistant"
            maxLength={800}
            className="min-h-20 resize-none sm:min-h-10"
            disabled={isLoading}
          />
          <Button type="submit" className="gap-2 sm:self-end" disabled={!question.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PermissionsAssistant;
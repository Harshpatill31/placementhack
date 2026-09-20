import { useState } from "react";
import { Bot, Check, Copy, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
      let answer = "";

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        answer += chunk;
      }

      const assistantText = answer.trim() || "I couldn't find an explanation for that question.";
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
      <CardContent className="flex min-h-[26rem] flex-col gap-4 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <ConversationEmptyState
              icon={<ShieldCheck className="size-10" />}
              title="Ask about your data"
              description="I explain visibility rules without accessing or displaying your private records."
            />
            <div className="flex flex-wrap gap-2">
              {starterQuestions.map((starter) => (
                <Button key={starter} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => askQuestion(starter)}>
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Conversation className="min-h-0 flex-1 rounded-md border bg-background/50" aria-label="Privacy assistant conversation">
            <ConversationContent aria-live="polite">
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.role === "assistant" ? <MessageResponse>{message.content}</MessageResponse> : message.content}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  <Shimmer>Checking the access rules…</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Scroll to latest answer" />
          </Conversation>
        )}

        <PromptInput
          onSubmit={(message: PromptInputMessage) => {
            void askQuestion(message.text);
          }}
          className="w-full"
        >
          <PromptInputTextarea
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            placeholder="Ask who can see your data…"
            aria-label="Ask the privacy assistant"
            maxLength={800}
            disabled={isLoading}
          />
          <PromptInputSubmit
            status={isLoading ? "submitted" : "ready"}
            disabled={!question.trim() || isLoading}
            aria-label="Ask privacy assistant"
          />
        </PromptInput>
      </CardContent>
    </Card>
  );
};

export default PermissionsAssistant;
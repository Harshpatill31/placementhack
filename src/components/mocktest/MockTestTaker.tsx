import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MockTestTakerProps {
  opportunityId: string;
  onBack: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer?: number;
  explanation?: string | null;
  difficulty: string | null;
  topic: string | null;
}

type TestPhase = "intro" | "test";

const MockTestTaker = ({ opportunityId, onBack }: MockTestTakerProps) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const { data: testInfo } = useQuery({
    queryKey: ["mock-test-info", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, title, short_description, duration")
        .eq("id", opportunityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["mock-test-questions", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_test_questions")
        .select("id, question, options, difficulty, topic, created_at")
        .eq("opportunity_id", opportunityId)
        .order("created_at");
      if (error) throw error;
      return (data || []).map((q) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      })) as Question[];
    },
  });

  // Timer
  useEffect(() => {
    if (phase !== "test") return;
    const interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const startTest = () => {
    if (questions) {
      setAnswers(new Array(questions.length).fill(null));
      setTimeElapsed(0);
      setCurrentQ(0);
      setPhase("test");
    }
  };

  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  };

  const submitTest = useCallback(async () => {
    if (!questions || !user) return;

    toast.error("Test submission is temporarily unavailable. Please try again.");
  }, [questions, user]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading test...</div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No questions available for this test.</p>
            <Button onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // INTRO
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8">
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold mb-2">{testInfo?.title || "Mock Test"}</h1>
            <p className="text-muted-foreground mb-6">{testInfo?.short_description}</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-primary">{questions.length}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-primary">{testInfo?.duration || "60 min"}</div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
            </div>
            <div className="space-y-2 mb-6 text-sm text-muted-foreground">
              <p>• Answer all questions to the best of your ability</p>
              <p>• You can navigate between questions freely</p>
              <p>• Timer will track your total time</p>
              <p>• Your answers are submitted securely for scoring</p>
            </div>
            <Button onClick={startTest} className="w-full" size="lg">
              Start Test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TEST PHASE
  const q = questions[currentQ];
  const answered = answers.filter((a) => a !== null).length;
  const progress = (answered / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h2 className="font-semibold text-sm truncate">{testInfo?.title}</h2>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> {formatTime(timeElapsed)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {answered}/{questions.length} answered
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1 mt-2 max-w-3xl mx-auto" />
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* Question navigation dots */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={cn(
                "h-8 w-8 rounded-full text-xs font-medium transition-all",
                currentQ === i && "ring-2 ring-primary",
                answers[i] !== null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">{q.topic || "General"}</Badge>
              <Badge variant="outline" className={cn("text-xs capitalize",
                q.difficulty === "hard" && "border-destructive text-destructive",
                q.difficulty === "easy" && "border-green-500 text-green-600"
              )}>
                {q.difficulty}
              </Badge>
            </div>
            <h3 className="text-lg font-medium mb-6">
              Q{currentQ + 1}. {q.question}
            </h3>
            <div className="space-y-3">
              {q.options.map((option: string, oi: number) => (
                <button
                  key={oi}
                  onClick={() => selectAnswer(oi)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-all text-sm",
                    answers[currentQ] === oi
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "hover:bg-muted border-border"
                  )}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          {currentQ === questions.length - 1 ? (
            <Button onClick={submitTest} className="gap-1 bg-green-600 hover:bg-green-700">
              Submit Test <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockTestTaker;

import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Goal {
  label: string;
  done: boolean;
  emoji: string;
}

export function DailyGoals() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: challengeDone } = useQuery({
    queryKey: ["dailyChallengeCheck", user?.id, today],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_challenge_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .gte("attempted_at", `${today}T00:00:00`)
        .lte("attempted_at", `${today}T23:59:59`);
      return (count || 0) > 0;
    },
    enabled: !!user?.id,
  });

  const { data: flashcardLimit } = useQuery({
    queryKey: ["flashcardLimit", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_flashcard_limits")
        .select("remaining_questions")
        .eq("user_id", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const flashcardsDone = (flashcardLimit?.remaining_questions ?? 10) < 10;

  const goals: Goal[] = [
    { label: "Complete a flashcard", emoji: "⚡", done: flashcardsDone },
    { label: "Daily challenge", emoji: "🎯", done: !!challengeDone },
  ];

  const completed = goals.filter((g) => g.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Daily Goals</h2>
        <span className="text-xs text-muted-foreground">
          {completed}/{goals.length}
        </span>
      </div>
      <div className="glass border border-border rounded-2xl p-3 space-y-2">
        {goals.map((goal, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                goal.done
                  ? "bg-accent/20 text-accent"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {goal.done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            </div>
            <span className="text-sm mr-1">{goal.emoji}</span>
            <span className={`text-sm ${goal.done ? "line-through text-muted-foreground" : ""}`}>
              {goal.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

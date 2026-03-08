import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function StreaksXP() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const currentLevel = Math.floor((stats?.total_xp || 0) / 1000) + 1;
  const xpInLevel = (stats?.total_xp || 0) % 1000;
  const xpToNext = 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="flex gap-3"
    >
      {/* Streak */}
      <div className="flex-1 glass border border-border rounded-2xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{stats?.current_streak || 0}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Day Streak</p>
        </div>
      </div>

      {/* XP / Level */}
      <div className="flex-1 glass border border-border rounded-2xl p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Star className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold">Level {currentLevel}</span>
        </div>
        <div className="bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(xpInLevel / xpToNext) * 100}%` }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="bg-gradient-accent h-full rounded-full"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {xpInLevel}/{xpToNext} XP
        </p>
      </div>
    </motion.div>
  );
}

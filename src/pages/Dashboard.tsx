import { motion } from "framer-motion";
import { Bot, BookOpen, Zap, Target, Gift } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdaptiveTimeline } from "@/components/modules/AdaptiveTimeline";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { moduleService } from "@/services/moduleService";
import { personaService } from "@/services/personaService";

const quickActions = [
  { icon: Bot, label: "AI Buddy", gradient: "primary", path: "/chat" },
  { icon: BookOpen, label: "Modules", gradient: "secondary", path: "/modules" },
  { icon: Zap, label: "Flashcards", gradient: "accent", path: "/flashcards" },
  { icon: Target, label: "Challenge", gradient: "primary", path: "/challenge" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const greeting = getGreeting();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('credits')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: modules } = useQuery({
    queryKey: ['modules', user?.id],
    queryFn: moduleService.getModules,
    enabled: !!user?.id,
  });

  const { data: flashcardProgress } = useQuery({
    queryKey: ['flashcardProgress', user?.id],
    queryFn: () => personaService.getTodayProgress(user!.id),
    enabled: !!user?.id,
  });

  const activeModules = modules
    ?.filter(m => (m.progress?.completion_percentage || 0) < 100)
    .slice(0, 3) || [];

  const userName = profile?.full_name || "Learner";

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mb-8"
      >
        <h1 className="text-2xl font-bold">
          {greeting}, <span className="text-primary">{userName}</span>
        </h1>
        <p className="text-muted-foreground">Ready to learn something new?</p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-primary rounded-3xl p-6 mb-6 relative overflow-hidden glow-primary"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">Today's Progress</h3>
              <p className="text-white/80 text-sm">Keep up the great work!</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">68%</div>
              <p className="text-white/80 text-xs">Complete</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "68%" }}
              transition={{ delay: 0.5, duration: 1 }}
              className="bg-white h-full rounded-full"
            />
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Credits Wallet */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 mb-6 flex justify-between items-center"
      >
        <div>
          <p className="text-muted-foreground text-sm mb-1">Credit Balance</p>
          <div className="text-3xl font-bold text-accent">
            {wallet?.credits || 0}
          </div>
        </div>
        <GradientButton variant="accent" onClick={() => navigate('/referral')}>
          <Gift className="w-4 h-4 mr-2" />
          Earn More
        </GradientButton>
      </motion.div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              onClick={() => navigate(action.path)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-${action.gradient} rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] transition-smooth relative overflow-hidden cursor-pointer`}
            >
              {action.label === "Flashcards" && (
                <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium">
                  {flashcardProgress || 0}/3 Today
                </div>
              )}
              <action.icon className="w-8 h-8 text-white" />
              <span className="text-white font-semibold">{action.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Adaptive Timeline */}
      <div className="mb-8">
        <AdaptiveTimeline />
      </div>

      {/* Recent Modules */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Continue Learning</h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {activeModules.length > 0 ? (
            activeModules.map((module, index) => {
              const progress = module.progress?.completion_percentage || 0;
              const colors = ["primary", "secondary", "accent"];
              const color = colors[index % colors.length];

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{module.title}</h3>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ delay: 1 + index * 0.1, duration: 0.8 }}
                      className={`bg-gradient-${color} h-full rounded-full`}
                    />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No active modules. Start a new one!
            </div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

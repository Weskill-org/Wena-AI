import { motion } from "framer-motion";
import { Bot, BookOpen, Zap, Target, Gift, ChevronRight } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdaptiveTimeline } from "@/components/modules/AdaptiveTimeline";
import { StreaksXP } from "@/components/dashboard/StreaksXP";
import { DailyGoals } from "@/components/dashboard/DailyGoals";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { moduleService } from "@/services/moduleService";
import { personaService } from "@/services/personaService";

const quickActions = [
  { icon: Bot, label: "AI Buddy", gradient: "primary", path: "/chat", description: "Chat with AI" },
  { icon: BookOpen, label: "Modules", gradient: "secondary", path: "/modules", description: "Learn skills" },
  { icon: Zap, label: "Flashcards", gradient: "accent", path: "/flashcards", description: "Quick review" },
  { icon: Target, label: "Challenge", gradient: "primary", path: "/challenge", description: "Daily quiz" },
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

  const userName = profile?.full_name?.split(' ')[0] || "Learner";

  return (
    <div className="min-h-screen pb-24 safe-area-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 z-40 bg-gradient-to-b from-background via-background to-transparent">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-2xl font-bold">
              Hi, <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">{userName}</span> 👋
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            className="w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden active-scale"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </motion.button>
        </motion.div>
      </div>

      <div className="px-4 space-y-5">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-primary rounded-3xl p-5 relative overflow-hidden glow-primary"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-white/90 font-medium text-sm">Today's Progress</h3>
                <p className="text-white text-3xl font-bold mt-1">
                  {Math.round(((10 - (flashcardProgress ?? 10)) / 10) * 100)}%
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(((10 - (flashcardProgress ?? 10)) / 10) * 100)}%` }}
                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                className="bg-white h-full rounded-full"
              />
            </div>
            <p className="text-white/70 text-xs mt-2">
              {Math.round(((10 - (flashcardProgress ?? 10)) / 10) * 100) === 100
                ? "Daily goal completed, amazing!"
                : "Keep up the great work!"}
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
        </motion.div>

        {/* Credits Wallet - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate('/wallet')}
          className="glass border border-border rounded-2xl p-4 flex justify-between items-center active-scale cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-xl font-bold text-accent">{wallet?.credits || 0}</p>
            </div>
          </div>
          <GradientButton
            variant="accent"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/referral');
            }}
            className="h-9 px-3 text-xs"
          >
            <Gift className="w-3.5 h-3.5 mr-1.5" />
            Earn
          </GradientButton>
        </motion.div>

        {/* Streaks & XP */}
        <StreaksXP />

        {/* Daily Goals */}
        <DailyGoals />

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                onClick={() => navigate(action.path)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileTap={{ scale: 0.97 }}
                className={`bg-gradient-${action.gradient} rounded-2xl p-4 flex flex-col gap-2 min-h-[100px] relative overflow-hidden cursor-pointer active-scale`}
              >
                {action.label === "Flashcards" && (
                  <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] text-white font-medium">
                    Remaining: {flashcardProgress || 0}/10
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold text-sm block">{action.label}</span>
                  <span className="text-white/70 text-xs">{action.description}</span>
                </div>
                {/* Decorative */}
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Adaptive Timeline */}
        <div>
          <AdaptiveTimeline />
        </div>

        {/* Recent Modules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Continue Learning</h2>
            <button
              onClick={() => navigate('/modules')}
              className="text-xs text-primary font-medium flex items-center gap-1"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2.5"
          >
            {activeModules.length > 0 ? (
              activeModules.map((module, index) => {
                const progress = module.progress?.completion_percentage || 0;
                const colors = ["primary", "secondary", "accent"];
                const color = colors[index % colors.length];
                const emojis = ["📚", "🎓", "💡"];

                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                    onClick={() => navigate(`/modules/${module.id}`)}
                    className="glass border border-border rounded-2xl p-3.5 flex items-center gap-3 active-scale cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-${color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg">{emojis[index]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{module.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
                            className={`bg-gradient-${color} h-full rounded-full`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })
            ) : (
              <div className="glass border border-border rounded-2xl p-6 text-center">
                <span className="text-3xl block mb-2">📖</span>
                <p className="text-muted-foreground text-sm">No active modules</p>
                <button
                  onClick={() => navigate('/modules')}
                  className="text-primary text-sm font-medium mt-2"
                >
                  Start learning →
                </button>
              </div>
            )}
          </motion.div>
        </div>
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

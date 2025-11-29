import { motion } from "framer-motion";
import { Bot, BookOpen, Zap, Target, Gift } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdaptiveTimeline } from "@/components/modules/AdaptiveTimeline";

const quickActions = [
  { icon: Bot, label: "AI Buddy", gradient: "primary", path: "/chat" },
  { icon: BookOpen, label: "Modules", gradient: "secondary", path: "/modules" },
  { icon: Zap, label: "Flashcards", gradient: "accent", path: "/flashcards" },
  { icon: Target, label: "Challenge", gradient: "primary", path: "/challenge" },
];

export default function Dashboard() {
  const userName = "Alex";
  const greeting = getGreeting();

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mb-8"
      >
        <h1 className="text-2xl font-bold">
          {greeting}, <span className="bg-gradient-primary bg-clip-text text-transparent">{userName}</span>
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
          <div className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            250
          </div>
        </div>
        <GradientButton variant="accent" className="h-10">
          <Gift className="w-4 h-4 mr-2" />
          Earn More
        </GradientButton>
      </motion.div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.a
              key={action.label}
              href={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-${action.gradient} rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] transition-smooth`}
            >
              <action.icon className="w-8 h-8 text-white" />
              <span className="text-white font-semibold">{action.label}</span>
            </motion.a>
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
          {[
            { title: "Python Basics", progress: 75, color: "primary" },
            { title: "AI Fundamentals", progress: 45, color: "secondary" },
            { title: "Web Design", progress: 30, color: "accent" },
          ].map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{module.title}</h3>
                <span className="text-sm text-muted-foreground">{module.progress}%</span>
              </div>
              <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${module.progress}%` }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.8 }}
                  className={`bg-gradient-${module.color} h-full rounded-full`}
                />
              </div>
            </motion.div>
          ))}
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

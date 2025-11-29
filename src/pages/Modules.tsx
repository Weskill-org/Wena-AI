import { motion } from "framer-motion";
import { Lock, Play } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { GradientButton } from "@/components/ui/gradient-button";

const modules = [
  {
    id: 1,
    title: "Python Fundamentals",
    description: "Master the basics of Python programming",
    progress: 75,
    locked: false,
    credits: 0,
    icon: "🐍",
  },
  {
    id: 2,
    title: "AI & Machine Learning",
    description: "Introduction to artificial intelligence",
    progress: 45,
    locked: false,
    credits: 0,
    icon: "🤖",
  },
  {
    id: 3,
    title: "Web Design Mastery",
    description: "Create beautiful, responsive websites",
    progress: 30,
    locked: false,
    credits: 0,
    icon: "🎨",
  },
  {
    id: 4,
    title: "Data Science Pro",
    description: "Advanced data analysis techniques",
    progress: 0,
    locked: true,
    credits: 25,
    icon: "📊",
  },
  {
    id: 5,
    title: "Blockchain Basics",
    description: "Understanding decentralized technology",
    progress: 0,
    locked: true,
    credits: 30,
    icon: "⛓️",
  },
];

export default function Modules() {
  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-2">Learning Modules</h1>
        <p className="text-muted-foreground">Unlock your potential, one module at a time</p>
      </motion.div>

      <div className="space-y-4">
        {modules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-5 ${
              module.locked ? "opacity-60" : ""
            }`}
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                  module.locked ? "bg-muted" : "bg-gradient-primary"
                }`}
              >
                {module.locked ? <Lock className="w-6 h-6 text-foreground" /> : module.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                  {module.locked && (
                    <div className="bg-accent/20 text-accent-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      {module.credits} credits
                    </div>
                  )}
                </div>

                {/* Progress or Unlock Button */}
                {!module.locked ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-semibold">{module.progress}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-1.5 overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${module.progress}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                        className="bg-gradient-primary h-full rounded-full"
                      />
                    </div>
                    <GradientButton variant="primary" className="w-full h-10">
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </GradientButton>
                  </>
                ) : (
                  <GradientButton variant="accent" className="w-full h-10 mt-2">
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock Module
                  </GradientButton>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

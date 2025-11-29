import { motion } from "framer-motion";
import { Coins, Gift, TrendingUp, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { GradientButton } from "@/components/ui/gradient-button";

const transactions = [
  { id: 1, type: "earned", amount: 50, label: "Module Completed", date: "Today" },
  { id: 2, type: "spent", amount: -25, label: "Unlocked Module", date: "Yesterday" },
  { id: 3, type: "earned", amount: 30, label: "Referral Bonus", date: "2 days ago" },
  { id: 4, type: "earned", amount: 20, label: "Daily Challenge", date: "3 days ago" },
];

export default function Wallet() {
  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-accent rounded-3xl p-6 mb-6 glow-accent"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-white/80 text-sm mb-1">Total Balance</p>
            <h1 className="text-5xl font-bold text-white">250</h1>
            <p className="text-white/80 text-sm mt-1">Credits</p>
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <Coins className="w-8 h-8 text-white" />
          </motion.div>
        </div>
        
        <div className="flex gap-3">
          <GradientButton variant="primary" className="flex-1 h-12">
            <Gift className="w-4 h-4 mr-2" />
            Earn More
          </GradientButton>
          <GradientButton variant="secondary" className="flex-1 h-12">
            <TrendingUp className="w-4 h-4 mr-2" />
            Top Up
          </GradientButton>
        </div>
      </motion.div>

      {/* Referral Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-primary rounded-3xl p-5 mb-6 glow-primary"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-semibold mb-1">Refer & Earn</h3>
            <p className="text-white/80 text-sm">Get 50 credits per friend</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
        <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 flex justify-between items-center">
          <code className="text-white font-mono font-semibold">ALEX2024</code>
          <button className="text-white text-sm font-semibold">Copy</button>
        </div>
      </motion.div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  tx.type === "earned" ? "bg-accent/20" : "bg-destructive/20"
                }`}>
                  {tx.type === "earned" ? (
                    <TrendingUp className={`w-5 h-5 text-accent`} />
                  ) : (
                    <Coins className={`w-5 h-5 text-destructive`} />
                  )}
                </div>
                <div>
                  <div className="font-semibold">{tx.label}</div>
                  <div className="text-xs text-muted-foreground">{tx.date}</div>
                </div>
              </div>
              <div className={`text-lg font-bold ${
                tx.type === "earned" ? "text-accent" : "text-destructive"
              }`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

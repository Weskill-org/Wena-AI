import { motion } from "framer-motion";
import { User, Wallet, Award, Settings, LogOut, Gift, ChevronRight, Edit } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  const { data: certificates } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const menuItems = [
    { icon: Wallet, label: "Credit Wallet", value: `${wallet?.credits || 0} credits`, path: "/wallet" },
    { icon: Award, label: "Certificates", value: `${certificates?.length || 0} earned`, path: "/certificates" },
    { icon: Gift, label: "Refer & Earn", value: "Share code", path: "/referral" },
    { icon: Settings, label: "Settings", value: "", path: "/settings" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-gradient-primary rounded-3xl p-6 glow-primary relative">
          <button
            onClick={() => navigate('/profile/edit')}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-smooth"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                "👤"
              )}
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.full_name || "Loading..."}</h1>
              <p className="text-white/80">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
                  Level 12
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
                  🔥 15 day streak
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Modules", value: "8", icon: "📚" },
          { label: "Hours", value: "42", icon: "⏱️" },
          { label: "Rank", value: "#156", icon: "🏆" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 text-center"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-3 mb-6">
        {menuItems.map((item, index) => (
          <motion.a
            key={item.label}
            href={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 flex items-center justify-between transition-smooth"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold">{item.label}</div>
                {item.value && (
                  <div className="text-sm text-muted-foreground">{item.value}</div>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.a>
        ))}
      </div>

      {/* Logout Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        className="w-full bg-destructive/10 text-destructive rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold transition-smooth hover:bg-destructive/20"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </motion.button>

      <BottomNav />
    </div>
  );
}

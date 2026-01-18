import { motion } from "framer-motion";
import { User, Wallet, Award, Settings, LogOut, Gift, ChevronRight, Edit, Sparkles } from "lucide-react";
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
    { icon: Wallet, label: "Credit Wallet", value: `${wallet?.credits || 0} credits`, path: "/wallet", emoji: "💰" },
    { icon: Award, label: "Certificates", value: `${certificates?.length || 0} earned`, path: "/certificates", emoji: "🏆" },
    { icon: Gift, label: "Refer & Earn", value: "Get 50 credits", path: "/referral", emoji: "🎁" },
    { icon: Sparkles, label: "AI Persona", value: "Customize AI", path: "/profile/ai-persona", emoji: "✨" },
    { icon: Settings, label: "Settings", value: "", path: "/settings", emoji: "⚙️" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: moduleStats } = useQuery({
    queryKey: ['moduleStats', user?.id],
    queryFn: async () => {
      const { count: totalCount, error: countError } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (countError) throw countError;

      const { count: completedCount, error: completedError } = await supabase
        .from('user_module_progress')
        .select('module_id', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('completion_percentage', 100);

      if (completedError) throw completedError;

      return {
        totalCount: totalCount || 0,
        completedCount: completedCount || 0
      };
    },
    enabled: !!user?.id,
  });

  const { data: rank } = useQuery({
    queryKey: ['rank', userStats?.total_xp],
    queryFn: async () => {
      if (!userStats?.total_xp) return 0;

      const { count, error } = await supabase
        .from('user_stats')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', userStats.total_xp);

      if (error) throw error;
      return (count || 0) + 1;
    },
    enabled: !!userStats?.total_xp,
  });

  // Calculate dynamic stats
  const currentLevel = Math.floor((userStats?.total_xp || 0) / 1000) + 1;
  const totalHours = Math.round((moduleStats?.completedCount || 0) * 2.5); // Approx 2.5 hours per module

  const stats = [
    { label: "Modules", value: (moduleStats?.totalCount || 0).toString(), emoji: "📚" },
    { label: "Hours", value: totalHours.toString(), emoji: "⏱️" },
    { label: "Rank", value: rank ? `#${rank}` : "-", emoji: "🏆" },
  ];

  return (
    <div className="min-h-screen pb-24 safe-area-top">
      {/* Profile Header */}
      <div className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="bg-gradient-primary rounded-3xl p-5 glow-primary relative overflow-hidden">
            {/* Edit Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/profile/edit')}
              className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center z-10"
            >
              <Edit className="w-4 h-4 text-white" />
            </motion.button>

            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-18 h-18 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl overflow-hidden border-2 border-white/30"
                style={{ width: 72, height: 72 }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{profile?.full_name || "Loading..."}</h1>
                <p className="text-white/70 text-sm truncate">{user?.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white font-medium">
                    Level {currentLevel || 1}
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white font-medium">
                    🔥 {userStats?.current_streak || 0} days
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>
        </motion.div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="glass border border-border rounded-2xl p-3 text-center"
            >
              <div className="text-xl mb-0.5">{stat.emoji}</div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              onClick={() => navigate(item.path)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass border border-border rounded-2xl p-3.5 flex items-center justify-between active-scale"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-lg">
                  {item.emoji}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">{item.label}</div>
                  {item.value && (
                    <div className="text-xs text-muted-foreground">{item.value}</div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-destructive/10 hover:bg-destructive/15 text-destructive rounded-2xl p-3.5 flex items-center justify-center gap-2 font-semibold text-sm active-scale"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}

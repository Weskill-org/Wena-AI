import { motion } from "framer-motion";
import { Award, ChevronLeft, Trophy, Star, Shield, Zap, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateLinkedInShareUrl } from "@/services/linkedinService";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Badge {
    id: string;
    name: string;
    description: string;
    emoji: string;
    criteria_type: string;
    criteria_value: number;
}

interface UserBadge {
    badge_id: string;
    earned_at: string;
}

export default function TrophyRoom() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: allBadges } = useQuery({
        queryKey: ['all-badges'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data as Badge[];
        }
    });

    const { data: earnedBadges } = useQuery({
        queryKey: ['user-badges', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_badges')
                .select('badge_id, earned_at')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data as UserBadge[];
        },
        enabled: !!user?.id
    });

    const isEarned = (badgeId: string) => earnedBadges?.some(eb => eb.badge_id === badgeId);

    return (
        <div className="min-h-screen pb-24 safe-area-top">
            {/* Header */}
            <div className="px-4 pt-6">
                <div className="flex items-center gap-4 mb-6">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="text-2xl font-bold">Trophy Room</h1>
                </div>

                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-primary rounded-3xl p-6 mb-8 text-center relative overflow-hidden glow-primary"
                >
                    <div className="relative z-10">
                        <Trophy className="w-16 h-16 text-white mx-auto mb-3" />
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {earnedBadges?.length || 0} / {allBadges?.length || 0}
                        </h2>
                        <p className="text-white/80">Badges Earned</p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-2xl" />
                </motion.div>

                {/* Badges Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {allBadges?.map((badge, index) => {
                        const earned = isEarned(badge.id);
                        return (
                            <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`glass border transition-all duration-300 rounded-3xl p-5 flex flex-col items-center text-center ${earned ? 'border-primary/30 glow-sm' : 'border-border grayscale opacity-60'
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4 ${earned ? 'bg-primary/10 shadow-inner' : 'bg-muted'
                                    }`}>
                                    {badge.emoji || "🏅"}
                                </div>
                                <h3 className="font-bold text-sm mb-1">{badge.name}</h3>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {badge.description}
                                </p>
                                {earned && (
                                    <div className="flex flex-col items-center gap-2 mt-3">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-primary/20 text-primary text-[8px] font-bold py-1 px-2 rounded-full flex items-center gap-1"
                                        >
                                            <Star className="w-2 h-2 fill-primary" /> EARNED
                                        </motion.div>
                                        <button
                                            onClick={() => {
                                                const shareUrl = generateLinkedInShareUrl(
                                                    `I just earned the ${badge.name} badge on Wena AI! 🚀`,
                                                    window.location.origin
                                                );
                                                window.open(shareUrl, '_blank');
                                            }}
                                            className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground"
                                            title="Share to LinkedIn"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {!allBadges?.length && (
                    <div className="text-center py-20 opacity-50">
                        <Award className="w-12 h-12 mx-auto mb-3" />
                        <p>Loading achievements...</p>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

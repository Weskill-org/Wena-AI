import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Download, Share2, Star, Trophy, X, Loader2, Sparkles, Zap } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface SkillResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SkillResumeModal: React.FC<SkillResumeModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const cardRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

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

    const { data: earnedBadges } = useQuery({
        queryKey: ['user-badges-details', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_badges')
                .select('earned_at, badges(*)')
                .eq('user_id', user?.id)
                .limit(4);
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const { data: moduleStats } = useQuery({
        queryKey: ['moduleStats-resume', user?.id],
        queryFn: async () => {
            const { count: completedCount, error } = await supabase
                .from('user_module_progress')
                .select('module_id', { count: 'exact', head: true })
                .eq('user_id', user?.id)
                .gte('completion_percentage', 100);
            if (error) throw error;
            return completedCount || 0;
        },
        enabled: !!user?.id,
    });

    const handleDownloadPNG = async () => {
        if (!cardRef.current) return;
        setExporting("png");
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1.0, cacheBust: true });
            const link = document.createElement('a');
            link.download = `WenaAI_Skill_Resume_${user?.id?.slice(0, 8)}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to export PNG:", err);
        } finally {
            setExporting(null);
        }
    };

    const handleDownloadPDF = async () => {
        if (!cardRef.current) return;
        setExporting("pdf");
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1.0, cacheBust: true });
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [400, 600]
            });
            pdf.addImage(dataUrl, 'PNG', 0, 0, 400, 600);
            pdf.save(`WenaAI_Skill_Resume_${user?.id?.slice(0, 8)}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF:", err);
        } finally {
            setExporting(null);
        }
    };

    const currentLevel = Math.floor((userStats?.total_xp || 0) / 1000) + 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-surface rounded-[40px] overflow-hidden shadow-2xl border border-border"
                    >
                        {/* Header bar */}
                        <div className="absolute top-6 right-6 z-20">
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Resume Card Content */}
                        <div ref={cardRef} className="bg-[#0F0F0F] text-white p-8 relative overflow-hidden flex flex-col items-center text-center" style={{ width: 400, height: 600 }}>
                            {/* Decorative Background */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]" />

                            {/* Logo / Brand */}
                            <div className="flex items-center gap-2 mb-8 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-lg tracking-tight">Wena AI</span>
                            </div>

                            {/* Profile Info */}
                            <div className="mb-8 relative z-10">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-5xl mb-4 mx-auto overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : "👤"}
                                </div>
                                <h1 className="text-2xl font-bold mb-1">{profile?.full_name || "Skill Explorer"}</h1>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-white/80 border border-white/10">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    Level {currentLevel} Learner
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 w-full mb-8 relative z-10">
                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                    <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                                    <div className="text-xl font-bold">{userStats?.total_xp || 0}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">XP</div>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                    <Award className="w-4 h-4 text-secondary mx-auto mb-1" />
                                    <div className="text-xl font-bold">{moduleStats}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Modules</div>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                    <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
                                    <div className="text-xl font-bold">{earnedBadges?.length || 0}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Badges</div>
                                </div>
                            </div>

                            {/* Badges Section */}
                            <div className="w-full text-left relative z-10 mb-8">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3 px-1">Top Achievements</h3>
                                <div className="flex flex-wrap gap-2">
                                    {earnedBadges?.map((eb: any) => (
                                        <div key={eb.badges.id} className="bg-white/10 rounded-xl p-2 border border-white/10 flex items-center gap-2">
                                            <span className="text-lg">{eb.badges.emoji}</span>
                                            <span className="text-[10px] font-bold">{eb.badges.name}</span>
                                        </div>
                                    ))}
                                    {(!earnedBadges || earnedBadges.length === 0) && (
                                        <div className="w-full text-center py-4 text-white/30 text-xs border border-dashed border-white/10 rounded-2xl italic">
                                            Keep learning to earn badges!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer / QR */}
                            <div className="mt-auto w-full flex items-center justify-between border-t border-white/10 pt-6 relative z-10">
                                <div className="text-left">
                                    <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-1">Generated on</p>
                                    <p className="text-xs font-medium">{format(new Date(), 'MMM dd, yyyy')}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-60">
                                    <span className="text-[10px] font-medium italic">Verified by Wena AI</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons (Not part of the ref for capture) */}
                        <div className="p-6 bg-surface grid grid-cols-2 gap-3">
                            <button
                                onClick={handleDownloadPNG}
                                disabled={!!exporting}
                                className="bg-primary text-white h-12 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {exporting === "png" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                PNG Card
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={!!exporting}
                                className="bg-surface border border-border text-foreground h-12 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                {exporting === "pdf" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                                PDF File
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

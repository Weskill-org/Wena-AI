import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Map, RefreshCw, Sparkles, ChevronRight, Clock, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { learningPathService, RoadmapItem } from "@/services/learningPathService";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonContainer } from "@/components/ui/SkeletonContainer";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
    high: {
        label: "🔥 High Priority",
        color: "text-orange-400",
        bg: "bg-orange-400/10 border-orange-400/30",
        badge: "bg-orange-400/20 text-orange-400",
    },
    recommended: {
        label: "⭐ Recommended",
        color: "text-primary",
        bg: "bg-primary/10 border-primary/30",
        badge: "bg-primary/20 text-primary",
    },
    later: {
        label: "📌 Nice to have",
        color: "text-muted-foreground",
        bg: "bg-muted/30 border-border",
        badge: "bg-muted text-muted-foreground",
    },
};

export default function LearningPath() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [regenerating, setRegenerating] = useState(false);

    const { data: path, isLoading, refetch } = useQuery({
        queryKey: ["learningPath", user?.id],
        queryFn: async () => {
            const existing = await learningPathService.getLatestLearningPath(user!.id);
            if (existing) return existing;
            // Auto-generate if none exists
            return learningPathService.generateLearningPath(user!.id);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const handleRegenerate = async () => {
        if (!user?.id) return;
        setRegenerating(true);
        try {
            await learningPathService.generateLearningPath(user.id);
            await refetch();
            toast.success("Roadmap refreshed! ✨");
        } catch (err) {
            console.error(err);
            toast.error("Failed to regenerate. Please try again.");
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="min-h-screen pb-24 safe-area-top">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 sticky top-0 z-40 bg-gradient-to-b from-background via-background to-transparent">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                            <Map className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">My Learning Roadmap</h1>
                            <p className="text-xs text-muted-foreground">AI-powered & personalized</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={regenerating || isLoading}
                        className="rounded-xl border-border h-9 px-3 gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                        <span className="text-xs">Refresh</span>
                    </Button>
                </motion.div>
            </div>

            <div className="px-4 space-y-4">
                {/* Content */}
                <SkeletonContainer
                    isLoading={isLoading || regenerating}
                    fallback={
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Summary skeleton */}
                            <div className="bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/20 rounded-3xl p-6 space-y-3">
                                <Skeleton className="h-4 w-1/3 mb-4" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-4/5" />
                            </div>
                            {/* Card skeletons */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="glass border border-border rounded-2xl p-4 flex gap-3 items-center">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    }
                >
                    {!isLoading && !regenerating && path && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={path.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                {/* AI Summary Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-r from-primary/15 to-pink-500/15 border border-primary/25 rounded-3xl p-5"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-semibold text-primary">Your AI Guide Says</span>
                                        </div>
                                        {path.total_estimated_days > 0 && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                                                <Clock className="w-3 h-3 text-primary" />
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                    ~{path.total_estimated_days} days to goal
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm leading-relaxed">{path.summary}</p>
                                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Generated {new Date(path.generated_at).toLocaleDateString("en-IN", {
                                            day: "numeric", month: "short", year: "numeric"
                                        })}
                                    </p>
                                </motion.div>

                                {/* Roadmap Steps */}
                                {path.roadmap.length === 0 ? (
                                    <div className="glass border border-border rounded-2xl p-8 text-center">
                                        <span className="text-4xl block mb-3">🎉</span>
                                        <p className="font-semibold mb-1">All caught up!</p>
                                        <p className="text-sm text-muted-foreground">Unlock new modules to expand your roadmap.</p>
                                        <Button
                                            onClick={() => navigate("/modules")}
                                            className="mt-4 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl"
                                        >
                                            Browse Modules
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Connecting line */}
                                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border/50" />

                                        <div className="space-y-3">
                                            {path.roadmap.map((item: RoadmapItem, idx: number) => {
                                                const config = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.recommended;
                                                return (
                                                    <motion.div
                                                        key={item.module_id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.06 }}
                                                        onClick={() => navigate(`/modules/${item.module_id}`)}
                                                        className={`relative glass border rounded-2xl p-4 cursor-pointer active-scale ml-5 ${config.bg}`}
                                                    >
                                                        {/* Step circle */}
                                                        <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary z-10">
                                                            {item.order}
                                                        </div>

                                                        <div className="pl-2">
                                                            {/* Priority + time */}
                                                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.badge}`}>
                                                                    {config.label}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    ~{item.estimated_days} {item.estimated_days === 1 ? "day" : "days"}
                                                                </span>
                                                            </div>

                                                            {/* Title */}
                                                            <h3 className="font-semibold text-sm mb-0.5 flex items-center justify-between gap-2">
                                                                <span>{item.title ?? "Module"}</span>
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                            </h3>

                                                            {/* Description */}
                                                            {item.description && (
                                                                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.description}</p>
                                                            )}

                                                            {/* AI Reason */}
                                                            <p className="text-xs italic text-muted-foreground/80">💡 {item.reason}</p>

                                                            {/* Progress bar (if started) */}
                                                            {(item.progress ?? 0) > 0 && (
                                                                <div className="mt-2.5">
                                                                    <div className="flex justify-between text-xs mb-1">
                                                                        <span className="text-muted-foreground">Progress</span>
                                                                        <span className="text-primary font-medium">{item.progress}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${item.progress}%` }}
                                                                            transition={{ duration: 0.6, delay: 0.2 + idx * 0.05 }}
                                                                            className="h-full bg-gradient-to-r from-primary to-pink-500 rounded-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Footer hint */}
                                <div className="text-center py-2">
                                    <p className="text-xs text-muted-foreground">
                                        Tap any module to jump right in →
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </SkeletonContainer>

                {/* Error / No path */}
                {!isLoading && !regenerating && !path && (
                    <div className="glass border border-border rounded-2xl p-8 text-center">
                        <span className="text-4xl block mb-3">🗺️</span>
                        <p className="font-semibold mb-1">No roadmap yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Generate your personalized plan now!</p>
                        <Button
                            onClick={handleRegenerate}
                            className="bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate My Path
                        </Button>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

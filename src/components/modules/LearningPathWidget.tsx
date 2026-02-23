import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Map, ChevronRight, Sparkles, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { learningPathService } from "@/services/learningPathService";

const PRIORITY_COLORS = {
    high: "from-orange-500 to-red-500",
    recommended: "from-primary to-pink-500",
    later: "from-muted-foreground to-muted-foreground",
};

export function LearningPathWidget() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [generating, setGenerating] = useState(false);

    const { data: path, isLoading, refetch } = useQuery({
        queryKey: ["learningPath", user?.id],
        queryFn: () => learningPathService.getLatestLearningPath(user!.id),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5,
    });

    const handleGenerate = async () => {
        if (!user?.id) return;
        setGenerating(true);
        try {
            await learningPathService.generateLearningPath(user.id);
            await refetch();
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="glass border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse" />
                    <div className="h-4 bg-muted rounded-full w-32 animate-pulse" />
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    // No path yet — prompt to generate
    if (!path) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-primary/20 rounded-2xl p-5 text-center"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center mx-auto mb-3">
                    <Map className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Get Your AI Roadmap</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Let AI build a personalized learning path just for you.
                </p>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                    {generating ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Generating…
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate My Path
                        </>
                    )}
                </button>
            </motion.div>
        );
    }

    const topItems = path.roadmap.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-border rounded-2xl p-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                        <Map className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold">AI Roadmap</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Refresh roadmap"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => navigate("/learning-path")}
                        className="text-xs text-primary font-medium flex items-center gap-0.5"
                    >
                        See all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Top 3 recommendations */}
            <div className="space-y-2">
                {topItems.map((item, idx) => {
                    const gradClass = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.recommended;
                    return (
                        <motion.div
                            key={item.module_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.07 }}
                            onClick={() => navigate(`/modules/${item.module_id}`)}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-background/50 border border-border/50 cursor-pointer hover:border-primary/30 transition-all active-scale"
                        >
                            {/* Order badge */}
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradClass} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-xs font-bold">{item.order}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.title ?? "Module"}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    ~{item.estimated_days}d
                                    {" · "}
                                    {item.priority === "high" ? "🔥 High" : item.priority === "recommended" ? "⭐ Recommended" : "📌 Later"}
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}

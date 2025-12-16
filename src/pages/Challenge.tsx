import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Flame, CheckCircle2, XCircle, Loader2, Award, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { challengeService, DailyChallenge, UserStats, LeaderboardEntry } from "@/services/challengeService";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Challenge() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [hasAttempted, setHasAttempted] = useState(false);
    const [attemptResult, setAttemptResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load Stats
            const stats = await challengeService.getUserStats(user!.id);
            setUserStats(stats);

            // Load Challenge & Attempt
            const { challenge, attempt } = await challengeService.getDailyChallenge(user!.id);
            setChallenge(challenge);

            if (attempt) {
                setHasAttempted(true);
                setAttemptResult({
                    isCorrect: attempt.is_correct,
                    points: attempt.points_earned
                });
                setSelectedOption(attempt.response);
            }

            // Load Leaderboard
            const lb = await challengeService.getLeaderboard();
            setLeaderboard(lb);

        } catch (error) {
            console.error("Error loading challenge data:", error);
            toast.error("Failed to load daily challenge");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedOption || !challenge) return;

        setSubmitting(true);
        try {
            const result = await challengeService.submitChallenge(user!.id, challenge.id, selectedOption);
            setAttemptResult({ isCorrect: result.isCorrect, points: result.points });
            setHasAttempted(true);

            if (result.isCorrect) {
                toast.success(`Correct! You earned ${result.points} XP.`);
                // Optimistically update stats
                if (userStats) {
                    setUserStats({
                        ...userStats,
                        total_xp: userStats.total_xp + result.points,
                        current_streak: userStats.current_streak + 1 // Simplified optimistic update
                    });
                }
            } else {
                toast.error("Incorrect answer. Better luck tomorrow!");
            }

            // Refresh leaderboard to show new score
            const lb = await challengeService.getLeaderboard();
            setLeaderboard(lb);

        } catch (error) {
            console.error("Error submitting challenge:", error);
            toast.error("Failed to submit answer");
        } finally {
            setSubmitting(false);
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Diamond': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
            case 'Platinum': return 'text-slate-300 bg-slate-300/10 border-slate-300/20';
            case 'Gold': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'Silver': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            default: return 'text-amber-600 bg-amber-600/10 border-amber-600/20';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 safe-area-top bg-background relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-20 right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-48 h-48 bg-accent/5 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Header */}
            <div className="px-4 pt-6 pb-4 sticky top-0 z-40 bg-gradient-to-b from-background via-background to-transparent">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center active-scale"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold">Daily Challenge</h1>
                    </div>

                    <div className="flex items-center gap-1.5 glass border border-border px-3 py-1.5 rounded-full">
                        <Flame className={`w-4 h-4 ${userStats?.current_streak && userStats.current_streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                        <span className="font-bold text-sm">{userStats?.current_streak || 0}</span>
                    </div>
                </motion.div>
            </div>

            <div className="px-4">
                <Tabs defaultValue="challenge" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
                        <TabsTrigger value="challenge" className="text-sm">Today's Challenge</TabsTrigger>
                        <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
                    </TabsList>

                <TabsContent value="challenge" className="space-y-4">
                    <AnimatePresence mode="wait">
                        {hasAttempted ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                            >
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${attemptResult?.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    {attemptResult?.isCorrect ? (
                                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    ) : (
                                        <XCircle className="w-10 h-10 text-red-500" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {attemptResult?.isCorrect ? 'Well Done!' : 'Nice Try!'}
                                </h2>
                                <p className="text-muted-foreground mb-6">
                                    {attemptResult?.isCorrect
                                        ? `You earned ${attemptResult.points} XP and kept your streak alive.`
                                        : 'You didn\'t get it this time, but come back tomorrow to try again!'}
                                </p>

                                {attemptResult?.isCorrect && (
                                    <div className="flex justify-center gap-4 mb-8">
                                        <div className="text-center p-4 bg-background/50 rounded-2xl min-w-[100px]">
                                            <div className="text-2xl font-bold text-primary">+{attemptResult.points}</div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider">XP Earned</div>
                                        </div>
                                        <div className="text-center p-4 bg-background/50 rounded-2xl min-w-[100px]">
                                            <div className="text-2xl font-bold text-orange-500">{userStats?.current_streak}</div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Day Streak</div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-muted/50 rounded-xl mb-6 text-left">
                                    <p className="text-sm font-medium mb-1 text-muted-foreground">The Question Was:</p>
                                    <p className="mb-2 italic">"{challenge?.question}"</p>
                                    <p className="text-sm font-medium mb-1 text-muted-foreground">Correct Answer:</p>
                                    <p className="font-semibold text-green-500">{challenge?.correct_answer || "N/A"}</p>
                                </div>

                                <Button onClick={() => navigate('/modules')} className="w-full">
                                    Continue Learning
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="question"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                    <Award className="w-24 h-24 text-accent/10 -rotate-12" />
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${challenge?.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            challenge?.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                        }`}>
                                        {challenge?.difficulty}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                        {challenge?.topic}
                                    </span>
                                </div>

                                <h2 className="text-xl font-semibold mb-6 leading-relaxed relative z-10">
                                    {challenge?.question}
                                </h2>

                                <div className="space-y-3 relative z-10">
                                    {challenge?.options?.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedOption(option)}
                                            className={`w-full p-4 rounded-xl border text-left transition-all ${selectedOption === option
                                                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                                    : 'bg-background/50 border-border hover:bg-background hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${selectedOption === option ? 'bg-primary text-white border-primary' : 'border-muted-foreground text-muted-foreground'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={selectedOption === option ? 'font-medium' : ''}>{option}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <Button
                                        className="w-full h-12 text-lg"
                                        disabled={!selectedOption || submitting}
                                        onClick={handleSubmit}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            "Submit Answer"
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </TabsContent>

                <TabsContent value="leaderboard">
                    <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Top Learners</h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getTierColor(userStats?.tier || 'Bronze')}`}>
                                    <Star className="w-3 h-3" fill="currentColor" />
                                    {userStats?.tier} League
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-border/50">
                            {leaderboard.map((entry) => (
                                <motion.div
                                    key={entry.user_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-4 flex items-center justify-between ${entry.user_id === user?.id ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${entry.rank === 1 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                                                entry.rank === 2 ? 'bg-slate-400 text-white' :
                                                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                                                        'text-muted-foreground bg-muted'
                                            }`}>
                                            {entry.rank}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10 border border-border">
                                                <AvatarImage src={entry.avatar_url || undefined} />
                                                <AvatarFallback>{entry.full_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {entry.full_name || 'Anonymous'}
                                                    {entry.user_id === user?.id && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">YOU</span>}
                                                </div>
                                                <div className={`text-xs font-medium ${getTierColor(entry.tier).split(' ')[0]}`}>
                                                    {entry.tier}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary">{entry.total_xp} XP</div>
                                    </div>
                                </motion.div>
                            ))}

                            {leaderboard.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    No active players yet. Be the first!
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}

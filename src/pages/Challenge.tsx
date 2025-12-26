import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Flame, CheckCircle2, XCircle, Loader2, Gift, Clock, Play, Crown, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { challengeService, GeneratedChallenge, UserStats, LeaderboardEntry } from "@/services/challengeService";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const TIMER_SECONDS = 60;

export default function Challenge() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    
    // Challenge state
    const [challengeState, setChallengeState] = useState<'idle' | 'loading' | 'active' | 'completed' | 'cooldown'>('idle');
    const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{
        isCorrect: boolean;
        xpEarned: number;
        creditsEarned: number;
        newStreak: number;
        streakReward?: number;
        daysToNextReward: number;
        correctAnswer: string;
    } | null>(null);
    
    // Timer
    const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Cooldown
    const [cooldownMinutes, setCooldownMinutes] = useState(0);

    useEffect(() => {
        if (user?.id) {
            loadInitialData();
        }
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [user?.id]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [stats, lb] = await Promise.all([
                challengeService.getUserStats(user!.id),
                challengeService.getLeaderboard()
            ]);
            
            setUserStats(stats);
            setLeaderboard(lb);

            // Check if user can attempt today
            const canAttempt = await challengeService.canAttemptToday(user!.id);
            
            if (canAttempt.completedToday) {
                setChallengeState('completed');
            } else if (canAttempt.reason === 'cooldown' && canAttempt.waitMinutes) {
                setChallengeState('cooldown');
                setCooldownMinutes(canAttempt.waitMinutes);
            } else {
                setChallengeState('idle');
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load challenge data");
        } finally {
            setLoading(false);
        }
    };

    const startChallenge = async () => {
        setChallengeState('loading');
        setSelectedOption(null);
        setResult(null);
        setTimeLeft(TIMER_SECONDS);
        
        try {
            const generatedChallenge = await challengeService.generateChallenge();
            setChallenge(generatedChallenge);
            setChallengeState('active');
            
            // Start timer
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Error starting challenge:", error);
            toast.error("Failed to generate challenge");
            setChallengeState('idle');
        }
    };

    const handleTimeUp = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (!challenge || !user?.id) return;
        
        // Auto-submit as wrong if time runs out
        setSubmitting(true);
        try {
            const submitResult = await challengeService.submitAnswer(
                user.id,
                '', // Empty answer = wrong
                challenge.correct_answer
            );
            
            setResult({
                ...submitResult,
                correctAnswer: challenge.correct_answer
            });
            
            if (!submitResult.isCorrect) {
                toast.error("Time's up! You can try again in 60 minutes.");
                setChallengeState('cooldown');
                setCooldownMinutes(60);
            }
        } catch (error) {
            console.error("Error on time up:", error);
        } finally {
            setSubmitting(false);
        }
    }, [challenge, user?.id]);

    const handleSubmit = async () => {
        if (!selectedOption || !challenge || !user?.id) return;
        
        if (timerRef.current) clearInterval(timerRef.current);
        
        setSubmitting(true);
        try {
            const submitResult = await challengeService.submitAnswer(
                user.id,
                selectedOption,
                challenge.correct_answer
            );
            
            setResult({
                ...submitResult,
                correctAnswer: challenge.correct_answer
            });
            
            if (submitResult.isCorrect) {
                toast.success(`Correct! +${submitResult.xpEarned} XP`);
                setChallengeState('completed');
                
                // Update local stats
                setUserStats(prev => prev ? {
                    ...prev,
                    total_xp: prev.total_xp + submitResult.xpEarned,
                    current_streak: submitResult.newStreak
                } : null);
            } else {
                toast.error("Incorrect! Try again in 60 minutes.");
                setChallengeState('cooldown');
                setCooldownMinutes(60);
            }

            // Refresh leaderboard
            const lb = await challengeService.getLeaderboard();
            setLeaderboard(lb);
        } catch (error) {
            console.error("Error submitting:", error);
            toast.error("Failed to submit answer");
        } finally {
            setSubmitting(false);
        }
    };

    const getTimerColor = () => {
        if (timeLeft <= 10) return 'text-red-500';
        if (timeLeft <= 30) return 'text-yellow-500';
        return 'text-green-500';
    };

    const streakRewards = challengeService.getStreakRewards();
    const nextRewardStreak = Object.keys(streakRewards)
        .map(Number)
        .find(s => s > (userStats?.current_streak || 0)) || 5;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 safe-area-top bg-background relative overflow-hidden">
            {/* Background */}
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

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 glass border border-border px-3 py-1.5 rounded-full">
                            <Flame className={`w-4 h-4 ${(userStats?.current_streak || 0) > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                            <span className="font-bold text-sm">{userStats?.current_streak || 0}</span>
                        </div>
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
                        {/* Streak Progress Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-2xl p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-5 h-5 text-orange-500" />
                                    <span className="font-semibold text-sm">Next Reward: {nextRewardStreak}-Day Streak</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    +{streakRewards[nextRewardStreak] || 20} credits
                                </span>
                            </div>
                            <Progress 
                                value={((userStats?.current_streak || 0) / nextRewardStreak) * 100} 
                                className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                {nextRewardStreak - (userStats?.current_streak || 0)} days to go • Resets monthly
                            </p>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {/* Idle State - Start Button */}
                            {challengeState === 'idle' && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                                >
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                        <Play className="w-10 h-10 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Ready for Today's Challenge?</h2>
                                    <p className="text-muted-foreground mb-6">
                                        Answer correctly within 60 seconds to keep your streak alive!
                                    </p>
                                    <Button onClick={startChallenge} size="lg" className="w-full h-14 text-lg">
                                        <Play className="w-5 h-5 mr-2" />
                                        Start Challenge
                                    </Button>
                                </motion.div>
                            )}

                            {/* Loading State */}
                            {challengeState === 'loading' && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                                >
                                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">Generating your unique challenge...</p>
                                </motion.div>
                            )}

                            {/* Active Challenge */}
                            {challengeState === 'active' && challenge && (
                                <motion.div
                                    key="active"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6"
                                >
                                    {/* Timer */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                challenge.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                challenge.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                                {challenge.difficulty}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                                {challenge.topic}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-2 font-bold text-lg ${getTimerColor()}`}>
                                            <Timer className="w-5 h-5" />
                                            {timeLeft}s
                                        </div>
                                    </div>

                                    {/* Progress bar for timer */}
                                    <Progress 
                                        value={(timeLeft / TIMER_SECONDS) * 100} 
                                        className={`h-1 mb-6 ${timeLeft <= 10 ? '[&>div]:bg-red-500' : timeLeft <= 30 ? '[&>div]:bg-yellow-500' : ''}`}
                                    />

                                    <h2 className="text-xl font-semibold mb-6 leading-relaxed">
                                        {challenge.question}
                                    </h2>

                                    <div className="space-y-3">
                                        {challenge.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedOption(option)}
                                                disabled={submitting}
                                                className={`w-full p-4 rounded-xl border text-left transition-all ${
                                                    selectedOption === option
                                                        ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                                        : 'bg-background/50 border-border hover:bg-background hover:border-primary/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                                                        selectedOption === option ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground text-muted-foreground'
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

                            {/* Cooldown State */}
                            {challengeState === 'cooldown' && (
                                <motion.div
                                    key="cooldown"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                                >
                                    <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                                        <Clock className="w-10 h-10 text-yellow-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Cooldown Active</h2>
                                    <p className="text-muted-foreground mb-4">
                                        You can try again with a new question in approximately:
                                    </p>
                                    <div className="text-4xl font-bold text-yellow-500 mb-6">
                                        ~{cooldownMinutes} min
                                    </div>
                                    
                                    {result && (
                                        <div className="p-4 bg-muted/50 rounded-xl text-left">
                                            <p className="text-sm font-medium mb-1 text-muted-foreground">Correct Answer:</p>
                                            <p className="font-semibold text-green-500">{result.correctAnswer}</p>
                                        </div>
                                    )}

                                    <Button onClick={() => navigate('/modules')} variant="outline" className="w-full mt-6">
                                        Continue Learning
                                    </Button>
                                </motion.div>
                            )}

                            {/* Completed State */}
                            {challengeState === 'completed' && (
                                <motion.div
                                    key="completed"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                                >
                                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Well Done!</h2>
                                    <p className="text-muted-foreground mb-6">
                                        You've completed today's challenge. Come back tomorrow!
                                    </p>

                                    {result && (
                                        <div className="flex justify-center gap-4 mb-6">
                                            <div className="text-center p-4 bg-background/50 rounded-2xl min-w-[100px]">
                                                <div className="text-2xl font-bold text-primary">+{result.xpEarned}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider">XP Earned</div>
                                            </div>
                                            <div className="text-center p-4 bg-background/50 rounded-2xl min-w-[100px]">
                                                <div className="text-2xl font-bold text-orange-500">{result.newStreak}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Day Streak</div>
                                            </div>
                                            <div className="text-center p-4 bg-background/50 rounded-2xl min-w-[100px]">
                                                <div className="text-2xl font-bold text-green-500">+{result.creditsEarned}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Credits</div>
                                            </div>
                                        </div>
                                    )}

                                    {result?.streakReward && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl mb-6"
                                        >
                                            <div className="flex items-center justify-center gap-2 text-yellow-500">
                                                <Gift className="w-5 h-5" />
                                                <span className="font-bold">🎉 {result.newStreak}-Day Streak Bonus: +{result.streakReward} Credits!</span>
                                            </div>
                                        </motion.div>
                                    )}

                                    <p className="text-sm text-muted-foreground mb-6">
                                        {result?.daysToNextReward} days until your next streak reward
                                    </p>

                                    <Button onClick={() => navigate('/modules')} className="w-full">
                                        Continue Learning
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="leaderboard">
                        <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl overflow-hidden">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-yellow-500" />
                                        Top 10 Learners
                                    </h3>
                                    <span className="text-xs text-muted-foreground">This Month</span>
                                </div>
                            </div>

                            <div className="divide-y divide-border/50">
                                {leaderboard.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No entries yet. Be the first!
                                    </div>
                                ) : (
                                    leaderboard.map((entry) => (
                                        <motion.div
                                            key={entry.user_id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`p-4 flex items-center justify-between ${entry.user_id === user?.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                                                    entry.rank === 1 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                                                    entry.rank === 2 ? 'bg-slate-400 text-white' :
                                                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                                                    'text-muted-foreground bg-muted'
                                                }`}>
                                                    {entry.rank}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10 border border-border">
                                                        <AvatarImage src={entry.avatar_url || undefined} />
                                                        <AvatarFallback>{entry.first_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold flex items-center gap-2">
                                                            {entry.first_name}
                                                            {entry.user_id === user?.id && (
                                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">YOU</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Flame className="w-3 h-3 text-orange-500" />
                                                            {entry.current_streak} day streak
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{entry.total_xp} XP</div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Crown, Timer, Loader2, Play, CheckCircle2, XCircle, Flame, Shield, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { challengeService, GeneratedChallenge, Tournament, TournamentParticipant } from "@/services/challengeService";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

const TOURNAMENT_TIMER_SECONDS = 45; // Harder than daily challenge

export default function TournamentPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [leaderboard, setLeaderboard] = useState<TournamentParticipant[]>([]);
    const [userParticipation, setUserParticipation] = useState<TournamentParticipant | null>(null);

    // Challenge state
    const [gameState, setGameState] = useState<'intro' | 'loading' | 'active' | 'completed'>('intro');
    const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Timer
    const [timeLeft, setTimeLeft] = useState(TOURNAMENT_TIMER_SECONDS);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadTournamentData();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [user?.id]);

    const loadTournamentData = async () => {
        try {
            setLoading(true);
            const activeTournament = await challengeService.getActiveTournament();
            setTournament(activeTournament);

            if (activeTournament) {
                const lb = await challengeService.getTournamentLeaderboard(activeTournament.id);
                setLeaderboard(lb);

                const me = lb.find(p => p.user_id === user?.id);
                if (me) setUserParticipation(me);
            }
        } catch (error) {
            console.error("Error loading tournament:", error);
            toast.error("Failed to load tournament data");
        } finally {
            setLoading(false);
        }
    };

    const startTournamentChallenge = async () => {
        if (!tournament) return;

        setGameState('loading');
        setSelectedOption(null);
        setTimeLeft(TOURNAMENT_TIMER_SECONDS);

        try {
            const generatedChallenge = await challengeService.generateChallenge(tournament.theme);
            setChallenge(generatedChallenge);
            setGameState('active');

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
            setGameState('intro');
        }
    };

    const handleTimeUp = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        submitAnswer(false);
    }, []);

    const handleSubmit = () => {
        if (!selectedOption || !challenge) return;
        if (timerRef.current) clearInterval(timerRef.current);

        const isCorrect = selectedOption === challenge.correct_answer;
        submitAnswer(isCorrect);
    };

    const submitAnswer = async (isCorrect: boolean) => {
        if (!user?.id || !tournament) return;

        setSubmitting(true);
        try {
            await challengeService.submitTournamentAnswer(user.id, tournament.id, isCorrect);

            if (isCorrect) {
                toast.success("Correct! +50 Tournament Points");
            } else {
                toast.error("Incorrect! No points awarded.");
            }

            setGameState('completed');
            // Reload leaderboard to show progress
            const lb = await challengeService.getTournamentLeaderboard(tournament.id);
            setLeaderboard(lb);
            const me = lb.find(p => p.user_id === user?.id);
            if (me) setUserParticipation(me);

        } catch (error) {
            console.error("Error submitting answer:", error);
            toast.error("Failed to save result");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <Trophy className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                <h2 className="text-2xl font-bold mb-2">No Active Tournament</h2>
                <p className="text-muted-foreground mb-6">Check back soon for the next weekly tournament!</p>
                <Button onClick={() => navigate('/challenge')}>Go to Daily Challenge</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 safe-area-top bg-background relative overflow-hidden">
            {/* Themed Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-20 right-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="px-4 pt-6 pb-4 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/challenge')}
                            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center active-scale"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">Weekly Tournament</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{tournament.theme}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-6 space-y-6">
                {/* Tournament Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20"
                >
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-2">
                            <h2 className="text-2xl font-black">{tournament.title}</h2>
                            <Trophy className="w-10 h-10 text-white/30" />
                        </div>
                        <p className="text-white/80 text-sm mb-6 leading-relaxed">
                            {tournament.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-bold text-white/90">
                            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <Timer className="w-3.5 h-3.5" />
                                <span>ENDS {format(new Date(tournament.end_date), 'MMM dd')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <Medal className="w-3.5 h-3.5" />
                                <span>Top 3 earn bonus rewards</span>
                            </div>
                        </div>
                    </div>
                    {/* Abstract background shapes */}
                    <div className="absolute top-[-10%] right-[-5%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-60 h-60 bg-black/10 rounded-full blur-3xl" />
                </motion.div>

                <AnimatePresence mode="wait">
                    {gameState === 'intro' && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            {/* Personal Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface/50 border border-border rounded-2xl p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Your Score</p>
                                    <p className="text-2xl font-bold text-primary">{userParticipation?.score || 0}</p>
                                </div>
                                <div className="bg-surface/50 border border-border rounded-2xl p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Current Rank</p>
                                    <p className="text-2xl font-bold text-yellow-500">#{userParticipation?.rank || '-'}</p>
                                </div>
                            </div>

                            <Button onClick={startTournamentChallenge} size="lg" className="w-full h-16 text-lg rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                                <Play className="w-6 h-6 mr-2 fill-current" />
                                Participate Now
                            </Button>

                            {/* Leaderboard Section */}
                            <div className="bg-surface/50 border border-border rounded-3xl overflow-hidden mt-8">
                                <div className="p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                            Tournament Leaderboard
                                        </h3>
                                    </div>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {leaderboard.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground text-sm">
                                            No warriors have entered yet!
                                        </div>
                                    ) : (
                                        leaderboard.map((entry) => (
                                            <div
                                                key={entry.user_id}
                                                className={`p-4 flex items-center justify-between ${entry.user_id === user?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-full ${entry.rank === 1 ? 'bg-yellow-500 text-white' :
                                                            entry.rank === 2 ? 'bg-slate-400 text-white' :
                                                                entry.rank === 3 ? 'bg-amber-600 text-white' :
                                                                    'text-muted-foreground bg-muted'
                                                        }`}>
                                                        {entry.rank}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-9 h-9 border border-border">
                                                            <AvatarImage src={entry.avatar_url || undefined} />
                                                            <AvatarFallback>{entry.first_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-sm">
                                                                {entry.first_name}
                                                                {entry.user_id === user?.id && <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1 py-0.5 rounded">YOU</span>}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {entry.attempts_count} challenges
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-sm text-primary">{entry.score} pts</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-surface/50 border border-border rounded-3xl p-12 text-center"
                        >
                            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground italic">Consulting the Grand Archivist for your theme-based challenge...</p>
                        </motion.div>
                    )}

                    {gameState === 'active' && challenge && (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 relative overflow-hidden"
                        >
                            {/* Hard Mode Badge */}
                            <div className="absolute top-0 right-0 px-4 py-1.5 bg-red-500 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-widest">
                                Tournament Speed Mode
                            </div>

                            <div className="flex items-center justify-between mb-6 pt-4">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20 uppercase">
                                    {challenge.topic}
                                </span>
                                <div className={`flex items-center gap-2 font-black text-xl ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                    <Timer className="w-5 h-5" />
                                    {timeLeft}s
                                </div>
                            </div>

                            <Progress
                                value={(timeLeft / TOURNAMENT_TIMER_SECONDS) * 100}
                                className={`h-1.5 mb-8 ${timeLeft <= 10 ? '[&>div]:bg-red-500' : ''}`}
                            />

                            <h2 className="text-xl font-bold mb-8 leading-tight">
                                {challenge.question}
                            </h2>

                            <div className="space-y-3">
                                {challenge.options.map((option, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedOption(option)}
                                        disabled={submitting}
                                        className={`w-full p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${selectedOption === option
                                                ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                                : 'bg-background/50 border-border hover:bg-background hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-black text-xs transition-colors ${selectedOption === option ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground text-muted-foreground group-hover:border-primary/50'
                                                }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm ${selectedOption === option ? 'font-bold' : ''}`}>{option}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-10">
                                <Button
                                    className="w-full h-14 text-lg font-bold rounded-xl"
                                    disabled={!selectedOption || submitting}
                                    onClick={handleSubmit}
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit To Tournament"}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'completed' && (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-surface/50 border border-border rounded-3xl p-10 text-center"
                        >
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${selectedOption === challenge?.correct_answer ? 'bg-green-500/10 text-green-500 shadow-green-500/10' : 'bg-red-500/10 text-red-500 shadow-red-500/10'}`}>
                                {selectedOption === challenge?.correct_answer ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                            </div>

                            <h2 className="text-2xl font-black mb-2">
                                {selectedOption === challenge?.correct_answer ? "Strategic Mastery!" : "Defeat this time."}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-8">
                                {selectedOption === challenge?.correct_answer
                                    ? "Perfect answer! You've gained 50 tournament points."
                                    : "The Grand Archivist notes your attempt. Keep training for better results!"}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-background/50 p-4 rounded-2xl border border-border">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">XP Earned</p>
                                    <p className="text-xl font-black text-primary">+{selectedOption === challenge?.correct_answer ? 20 : 0}</p>
                                </div>
                                <div className="bg-background/50 p-4 rounded-2xl border border-border">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Tourney Score</p>
                                    <p className="text-xl font-black text-yellow-500">+{selectedOption === challenge?.correct_answer ? 50 : 0}</p>
                                </div>
                            </div>

                            <Button onClick={() => setGameState('intro')} variant="outline" className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5">
                                Back to Tournament Hub
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, CheckCircle2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personaService, FlashcardQuestion } from "@/services/personaService";

export default function Flashcards() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [questions, setQuestions] = useState<FlashcardQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false); // New state for AI generation
    const [answer, setAnswer] = useState("");
    const [completed, setCompleted] = useState(false);
    const [remainingQuestions, setRemainingQuestions] = useState(0);
    const [sessionCount, setSessionCount] = useState(0); // Track answers in this session
    const [initialDbCount, setInitialDbCount] = useState(0); // Track initial DB answers

    useEffect(() => {
        if (user?.id) {
            loadQuestions();
        }
    }, [user?.id]);

    const loadQuestions = async () => {
        try {
            setLoading(true);

            // Get remaining questions count directly
            const remaining = await personaService.getTodayProgress(user!.id);
            setRemainingQuestions(remaining);
            setInitialDbCount(10 - remaining);

            const data = await personaService.getDailyQuestions(user!.id);

            // If we have questions, set them
            if (data.length > 0) {
                setQuestions(data);
            } else {
                // No backend questions. Check if we have strict limit remaining.
                if (remaining > 0) {
                    await generateAndAddQuestion(data);
                } else {
                    setCompleted(true);
                }
            }
        } catch (error) {
            console.error("Error loading questions:", error);
            toast.error("Failed to load flashcards");
        } finally {
            setLoading(false);
        }
    };

    const generateAndAddQuestion = async (currentQuestions: FlashcardQuestion[]) => {
        setGenerating(true);
        try {
            const dynamicQ = await personaService.generateSingleDynamicQuestion(user!.id);
            if (dynamicQ) {
                setQuestions([...currentQuestions, dynamicQ]);
                return true;
            } else {
                // If generation fails and we have no questions, we are done
                if (currentQuestions.length === 0) setCompleted(true);
                return false;
            }
        } catch (error) {
            console.error("Error generating question:", error);
            toast.error("Failed to generate new question");
            return false;
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async () => {
        if (!answer.trim()) return;

        const currentQuestion = questions[currentIndex];
        setSubmitting(true);
        try {
            await personaService.submitFlashcardResponse(
                user!.id,
                currentQuestion.id,
                answer,
                currentQuestion.field_key
            );

            toast.success("Answer saved!");
            setAnswer("");

            // Strictly decrement local state to reflect the action immediately
            const newRemaining = remainingQuestions - 1;
            setRemainingQuestions(newRemaining);
            setSessionCount(prev => prev + 1);

            // Logic to move next or finish
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // We are at the end of the list.
                // Check if we need more questions.

                if (newRemaining > 0) {
                    // Generate next dynamic question
                    const success = await generateAndAddQuestion(questions);
                    if (success) {
                        setCurrentIndex(prev => prev + 1);
                    }
                } else {
                    setCompleted(true);
                }
            }
        } catch (error) {
            console.error("Error submitting answer:", error);
            toast.error("Failed to save answer");
        } finally {
            setSubmitting(false);
        }
    };

    const currentQuestion = questions[currentIndex];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-primary">Loading flashcards...</div>
            </div>
        );
    }

    // Special loading state for generation
    if (generating && !currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-primary flex flex-col items-center gap-4">
                    <Zap className="w-8 h-8 animate-spin" />
                    <span>Generating a personalized question for you...</span>
                </div>
            </div>
        );
    }

    if (!currentQuestion && !completed && !generating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
                    <p className="text-muted-foreground mb-4">We couldn't load your daily flashcards.</p>
                    <Button onClick={() => navigate('/')} variant="outline">
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 px-4 pt-8 bg-background relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-xl bg-surface/50 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-surface transition-smooth active-scale"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Daily Flashcards</h1>
                </div>

                {/* Session Progress Bar */}
                {!completed && (
                    <div className="mt-4 bg-surface/50 backdrop-blur-sm border border-border rounded-full p-1.5 flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((10 - remainingQuestions) / 10) * 100}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pr-2">
                            {10 - remainingQuestions}/10
                        </span>
                    </div>
                )}
            </motion.div>

            <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {completed ? (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-surface/50 backdrop-blur-lg border border-border rounded-[2rem] p-10 text-center relative overflow-hidden glare"
                        >
                            <div className="relative z-10">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/20"
                                >
                                    <CheckCircle2 className="w-12 h-12 text-white" />
                                </motion.div>
                                <h2 className="text-3xl font-bold mb-3">Goal Reached!</h2>
                                <p className="text-muted-foreground mb-8 leading-relaxed max-w-[240px] mx-auto">
                                    You've mastered 10 flashcards today. Your AI persona is getting smarter!
                                </p>
                                <Button
                                    onClick={() => navigate('/')}
                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white text-lg rounded-2xl shadow-lg shadow-primary/20"
                                >
                                    Back to Dashboard
                                </Button>
                            </div>

                            {/* Decorative background bursts */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.1, 0.2, 0.1]
                                }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.05, 0.1, 0.05]
                                }}
                                transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                                className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl"
                            />
                        </motion.div>
                    ) : (
                        generating ? (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[300px]"
                            >
                                <Zap className="w-10 h-10 text-primary animate-pulse mb-4" />
                                <p className="text-lg font-medium text-center">Thinking of a good question based on your last answer...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={currentQuestion.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 shadow-xl"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Remaining: {remainingQuestions} / 10
                                    </span>
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold">
                                        <Zap className="w-3 h-3" />
                                        {currentQuestion.category}
                                    </div>
                                </div>

                                <h2 className="text-xl font-semibold mb-8 leading-relaxed">
                                    {currentQuestion.question_text}
                                </h2>

                                <div className="space-y-6">
                                    {currentQuestion.input_type === 'select' && currentQuestion.options ? (
                                        <Select value={answer} onValueChange={setAnswer}>
                                            <SelectTrigger className="w-full h-12 bg-background/50 border-border">
                                                <SelectValue placeholder="Select an option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currentQuestion.options.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : currentQuestion.input_type === 'date' ? (
                                        <Input
                                            type="date"
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            className="h-12 bg-background/50 border-border"
                                        />
                                    ) : (
                                        <Input
                                            type="text"
                                            placeholder="Type your answer here..."
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            className="h-12 bg-background/50 border-border"
                                            autoFocus
                                        />
                                    )}

                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!answer || submitting}
                                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                                    >
                                        {submitting ? "Saving..." : (
                                            <span className="flex items-center gap-2">
                                                Next Question <ChevronRight className="w-5 h-5" />
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

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
    const [showAnswer, setShowAnswer] = useState(false); // SRS show answer state

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

    const handleSubmit = async (rating?: number) => {
        if (!answer.trim() && !showAnswer) return;

        const currentQuestion = questions[currentIndex];
        setSubmitting(true);
        try {
            await personaService.submitFlashcardResponse(
                user!.id,
                currentQuestion.id,
                showAnswer ? currentQuestion.previous_response || "" : answer,
                currentQuestion.field_key,
                rating
            );

            toast.success(currentQuestion.is_review ? "Review saved!" : "Answer saved!");
            setAnswer("");
            setShowAnswer(false);

            // Logic to move next or finish
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // We are at the end of the list. Fetch more if needed or finish.
                const data = await personaService.getDailyQuestions(user!.id);
                if (data.length > 0) {
                    setQuestions(data);
                    setCurrentIndex(0);
                } else if (remainingQuestions > 0) {
                    await generateAndAddQuestion([]);
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
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-xl bg-surface/50 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-surface transition-smooth"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Daily Flashcards</h1>
                </div>
            </motion.div>

            <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {completed ? (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
                            <p className="text-muted-foreground mb-6">
                                You've answered all 10 flashcards for today. Great job building your persona!
                            </p>
                            <Button
                                onClick={() => navigate('/')}
                                className="w-full bg-primary hover:bg-primary/90 text-white"
                            >
                                Back to Dashboard
                            </Button>
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
                                        {currentQuestion.is_review ? "Review Queue" : `New: ${remainingQuestions} / 10`}
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
                                    {currentQuestion.is_review ? (
                                        <div className="space-y-4">
                                            {!showAnswer ? (
                                                <Button
                                                    onClick={() => setShowAnswer(true)}
                                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                                                >
                                                    Show Answer
                                                </Button>
                                            ) : (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="space-y-6"
                                                >
                                                    <div className="p-4 rounded-2xl bg-background/50 border border-border italic text-muted-foreground">
                                                        "{currentQuestion.previous_response}"
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button
                                                            onClick={() => handleSubmit(0)} // Again
                                                            variant="outline"
                                                            className="h-12 border-red-500/50 text-red-500 hover:bg-red-500/10"
                                                        >
                                                            Again
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleSubmit(1)} // Hard
                                                            variant="outline"
                                                            className="h-12 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                                                        >
                                                            Hard
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleSubmit(2)} // Good
                                                            variant="outline"
                                                            className="h-12 border-green-500/50 text-green-500 hover:bg-green-500/10"
                                                        >
                                                            Good
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleSubmit(3)} // Easy
                                                            variant="outline"
                                                            className="h-12 border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                                                        >
                                                            Easy
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
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
                                                onClick={() => handleSubmit()}
                                                disabled={!answer || submitting}
                                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                                            >
                                                {submitting ? "Saving..." : (
                                                    <span className="flex items-center gap-2">
                                                        Next Question <ChevronRight className="w-5 h-5" />
                                                    </span>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

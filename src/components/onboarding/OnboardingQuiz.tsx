import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles, Target, Brain, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { personaService } from "@/services/personaService";
import { toast } from "sonner";

interface OnboardingQuizProps {
    onComplete: () => void;
}

const GOALS = [
    { value: "Career Growth", emoji: "🚀", desc: "Get a promotion or new job" },
    { value: "Personal Interest", emoji: "🎨", desc: "Learn something I love" },
    { value: "Academic", emoji: "🎓", desc: "Improve grades or research" },
    { value: "Skill Switch", emoji: "🔄", desc: "Transition to a new field" },
];

const SKILL_LEVELS = [
    { value: "Complete Beginner", emoji: "🌱", desc: "Starting from scratch" },
    { value: "Some Experience", emoji: "🌿", desc: "Know the basics" },
    { value: "Intermediate", emoji: "🌳", desc: "Comfortable but growing" },
    { value: "Advanced", emoji: "🏔️", desc: "Deep expertise already" },
];

const WEEKLY_HOURS = [
    { value: "< 1 hour", emoji: "⚡", desc: "Quick sessions when free" },
    { value: "1–3 hours", emoji: "📅", desc: "A few sessions per week" },
    { value: "3–5 hours", emoji: "💪", desc: "Dedicated daily practice" },
    { value: "5+ hours", emoji: "🔥", desc: "Intensive deep dives" },
];

const INTERESTS = [
    "Technology", "Business", "Design", "Marketing",
    "Finance", "Communication", "Leadership", "Data Science",
    "Health", "Language", "Arts", "Science",
];

type Step = "welcome" | "goal" | "skill" | "hours" | "interests";
const STEPS: Step[] = ["welcome", "goal", "skill", "hours", "interests"];

export function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
    const { user } = useAuth();
    const [stepIndex, setStepIndex] = useState(0);
    const [goal, setGoal] = useState("");
    const [skillLevel, setSkillLevel] = useState("");
    const [weeklyHours, setWeeklyHours] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const step = STEPS[stepIndex];
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === STEPS.length - 1;

    const canProceed = () => {
        if (step === "welcome") return true;
        if (step === "goal") return !!goal;
        if (step === "skill") return !!skillLevel;
        if (step === "hours") return !!weeklyHours;
        if (step === "interests") return selectedInterests.length > 0;
        return false;
    };

    const handleNext = async () => {
        if (!canProceed()) return;
        if (!isLast) {
            setStepIndex(i => i + 1);
            return;
        }
        // Last step — save
        if (!user?.id) return;
        setSaving(true);
        try {
            await personaService.completeOnboarding(
                user.id,
                goal,
                skillLevel,
                weeklyHours,
                selectedInterests
            );
            toast.success("Your learning path is being generated ✨");
            onComplete();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md"
            >
                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Step {stepIndex + 1} of {STEPS.length}</span>
                        <span>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}% complete</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-pink-500 rounded-full"
                            initial={{ width: "20%" }}
                            animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>
                </div>

                {/* Card */}
                <div className="bg-surface/80 backdrop-blur-lg border border-border rounded-3xl p-6 shadow-2xl">
                    <AnimatePresence mode="wait">
                        {/* WELCOME */}
                        {step === "welcome" && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                className="text-center space-y-4"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center mx-auto glow-primary">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Let's personalize your journey! 🧠</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Answer 4 quick questions so our AI can build a custom learning roadmap just for you.
                                        Takes less than 1 minute!
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* GOAL */}
                        {step === "goal" && (
                            <motion.div
                                key="goal"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                        <Target className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">What's your primary goal?</h2>
                                        <p className="text-xs text-muted-foreground">We'll tailor your path around this</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {GOALS.map(g => (
                                        <button
                                            key={g.value}
                                            onClick={() => setGoal(g.value)}
                                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${goal === g.value
                                                    ? "border-primary bg-primary/10 shadow-sm"
                                                    : "border-border bg-background/50 hover:border-primary/50"
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{g.emoji}</div>
                                            <div className="font-semibold text-sm">{g.value}</div>
                                            <div className="text-xs text-muted-foreground">{g.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* SKILL */}
                        {step === "skill" && (
                            <motion.div
                                key="skill"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">What's your current skill level?</h2>
                                        <p className="text-xs text-muted-foreground">Be honest — AI adjusts accordingly</p>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    {SKILL_LEVELS.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => setSkillLevel(s.value)}
                                            className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all duration-200 ${skillLevel === s.value
                                                    ? "border-secondary bg-secondary/10 shadow-sm"
                                                    : "border-border bg-background/50 hover:border-secondary/50"
                                                }`}
                                        >
                                            <span className="text-2xl">{s.emoji}</span>
                                            <div>
                                                <div className="font-semibold text-sm">{s.value}</div>
                                                <div className="text-xs text-muted-foreground">{s.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* HOURS */}
                        {step === "hours" && (
                            <motion.div
                                key="hours"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">How many hours per week?</h2>
                                        <p className="text-xs text-muted-foreground">This helps estimate completion times</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {WEEKLY_HOURS.map(h => (
                                        <button
                                            key={h.value}
                                            onClick={() => setWeeklyHours(h.value)}
                                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${weeklyHours === h.value
                                                    ? "border-accent bg-accent/10 shadow-sm"
                                                    : "border-border bg-background/50 hover:border-accent/50"
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{h.emoji}</div>
                                            <div className="font-semibold text-sm">{h.value}</div>
                                            <div className="text-xs text-muted-foreground">{h.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* INTERESTS */}
                        {step === "interests" && (
                            <motion.div
                                key="interests"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Pick your interests</h2>
                                        <p className="text-xs text-muted-foreground">Select everything that excites you</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {INTERESTS.map(interest => (
                                        <button
                                            key={interest}
                                            onClick={() => toggleInterest(interest)}
                                            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${selectedInterests.includes(interest)
                                                    ? "border-primary bg-primary text-white"
                                                    : "border-border bg-background/50 text-foreground hover:border-primary/50"
                                                }`}
                                        >
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                                {selectedInterests.length > 0 && (
                                    <p className="text-xs text-primary text-center">
                                        {selectedInterests.length} selected ✓
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex gap-3 mt-6">
                        {!isFirst && (
                            <Button
                                variant="outline"
                                onClick={() => setStepIndex(i => i - 1)}
                                className="flex-1 rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed() || saving}
                            className={`${isFirst ? "w-full" : "flex-1"} bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 text-white rounded-xl`}
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Building your path…
                                </span>
                            ) : isLast ? (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Generate My Path
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {step === "welcome" ? "Let's go!" : "Next"}
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

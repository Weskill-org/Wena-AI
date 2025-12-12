
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService } from "@/services/moduleService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen, Unlock } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useToast } from "@/components/ui/use-toast";
import CurriculumDriver from "@/components/modules/CurriculumDriver";
import { useLocation } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

export default function ModuleView() {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [moduleData, setModuleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDriver, setShowDriver] = useState(false);

    // Unlock Dialog State
    const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);

    const fetchDetails = async () => {
        if (!moduleId) return;
        try {
            const data = await moduleService.getModuleDetails(moduleId);
            setModuleData(data);
        } catch (error) {
            console.error("Error fetching module details:", error);
            toast({
                title: "Error",
                description: "Failed to load module details.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();

        if (location.state?.startCurriculum) {
            setShowDriver(true);
            window.history.replaceState({}, document.title);
        }
    }, [moduleId]);

    const handleContinueLearning = () => {
        if (!moduleData || !moduleData.chapters) return;

        // Find the first incomplete lesson (that is unlocked or next in line)
        // Actually, we should find the *first unlocked but incomplete* lesson.
        // Or simply the first incomplete one, assuming sequential progression.

        let allLessons: any[] = [];
        moduleData.chapters.forEach((c: any) => {
            if (c.lessons) allLessons = [...allLessons, ...c.lessons];
        });

        for (let i = 0; i < allLessons.length; i++) {
            const lesson = allLessons[i];
            const isCompleted = lesson.progress?.completed;

            // If not completed, this is our candidate.
            // But is it unlocked?
            // Logic: It's unlocked if it's the first one OR prev is completed OR it's explicitly unlocked.
            const prevCompleted = i === 0 || allLessons[i - 1].progress?.completed;
            const explicitlyUnlocked = lesson.progress?.unlocked;

            if (!isCompleted && (prevCompleted || explicitlyUnlocked)) {
                navigate(`/modules/${moduleId}/lessons/${lesson.id}`);
                return;
            }
        }

        // Fallback
        if (allLessons.length > 0) {
            navigate(`/ modules / ${moduleId} /lessons/${allLessons[0].id} `);
        }
    };

    const handleDriverComplete = () => {
        setShowDriver(false);
        toast({
            title: "Curriculum Personalized",
            description: "Your learning path has been updated.",
        });
    };

    const handleLessonClick = (lesson: any, isUnlocked: boolean) => {
        if (isUnlocked) {
            navigate(`/modules/${moduleId}/lessons/${lesson.id}`);
        } else {
            setSelectedLessonId(lesson.id);
            setUnlockDialogOpen(true);
        }
    };

    const confirmUnlock = async () => {
        if (!selectedLessonId || !user) return;
        setUnlocking(true);
        try {
            await moduleService.unlockLesson(selectedLessonId, user.id);
            toast({
                title: "Lesson Unlocked",
                description: "2 credits deducted.",
            });
            setUnlockDialogOpen(false);
            fetchDetails(); // Refresh to show unlocked status
        } catch (error: any) {
            toast({
                title: "Unlock Failed",
                description: error.message || "Insufficient credits or error.",
                variant: "destructive",
            });
        } finally {
            setUnlocking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!moduleData) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Module not found</h1>
                <Button onClick={() => navigate("/modules")}>Back to Modules</Button>
            </div>
        );
    }

    const { module, chapters } = moduleData;

    // Flatten lessons to calculate global index/status easily if needed, 
    // but we can also do it iteratively.
    let globalLessonIndex = 0;
    let previousLessonCompleted = true; // Start true for the very first lesson

    return (
        <div className="container mx-auto py-8 px-4 pb-24">
            <Button variant="ghost" className="mb-6" onClick={() => navigate("/modules")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
            </Button>

            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
                    <p className="text-muted-foreground">{module.description}</p>
                </div>
                <Button size="lg" onClick={handleContinueLearning}>
                    <BookOpen className="w-4 h-4 mr-2" /> Continue Learning
                </Button>
            </div>

            <div className="space-y-6">
                {chapters.map((chapter: any, index: number) => (
                    <Card key={chapter.id}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {chapter.title}
                                </CardTitle>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                    Chapter {index + 1}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{chapter.description}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {chapter.lessons.map((lesson: any) => {
                                    // Determine unlock status
                                    // Unlocked if: Previous lesson was completed OR this lesson is explicitly unlocked
                                    const isUnlocked = previousLessonCompleted || lesson.progress?.unlocked;

                                    // Update tracker for NEXT lesson
                                    // The next lesson will be unlocked only if THIS lesson is completed.
                                    const isCompleted = lesson.progress?.completed;
                                    previousLessonCompleted = isCompleted;

                                    return (
                                        <div
                                            key={lesson.id}
                                            className={`flex items - center justify - between p - 3 rounded - lg border border - transparent transition - colors
                                                ${isUnlocked
                                                    ? "hover:bg-accent cursor-pointer hover:border-border"
                                                    : "opacity-70 bg-muted/30 cursor-pointer hover:bg-muted/50"
                                                } `}
                                            onClick={() => handleLessonClick(lesson, isUnlocked)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p - 2 rounded - full ${isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"} `}>
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5" />
                                                    ) : isUnlocked ? (
                                                        <PlayCircle className="w-5 h-5" />
                                                    ) : (
                                                        <Lock className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium">{lesson.title}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                {isCompleted ? (
                                                    "Completed"
                                                ) : isUnlocked ? (
                                                    "Start"
                                                ) : (
                                                    <span className="flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                        <Lock className="w-3 h-3 mr-1" /> 2 Credits
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <CurriculumDriver
                isOpen={showDriver}
                onClose={() => setShowDriver(false)}
                onComplete={handleDriverComplete}
                moduleTitle={module.title}
                moduleId={moduleId}
            />

            <AlertDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlock Lesson?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This lesson is currently locked. You can unlock it immediately for 2 credits.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnlock} disabled={unlocking}>
                            {unlocking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                            Unlock for 2 Credits
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BottomNav />
        </div>
    );
}


import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService } from "@/services/moduleService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useToast } from "@/components/ui/use-toast";
import CurriculumDriver from "@/components/modules/CurriculumDriver";

import { useLocation } from "react-router-dom";

export default function ModuleView() {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [moduleData, setModuleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDriver, setShowDriver] = useState(false);

    useEffect(() => {
        if (!moduleId) return;

        const fetchDetails = async () => {
            try {
                const data = await moduleService.getModuleDetails(moduleId);
                setModuleData(data);

                // Check for auto-start from navigation state
                if (location.state?.startCurriculum) {
                    setShowDriver(true);
                    // Clear state so it doesn't re-trigger on refresh (optional, but good practice)
                    window.history.replaceState({}, document.title);
                }
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

        fetchDetails();
    }, [moduleId]);

    const handleContinueLearning = () => {
        console.log("handleContinueLearning called", JSON.stringify(moduleData, null, 2));

        if (!moduleData || !moduleData.chapters) {
            console.log("No module data or chapters found");
            return;
        }

        // Find the first incomplete lesson
        for (const chapter of moduleData.chapters) {
            console.log("Checking chapter:", chapter.title);
            if (chapter.lessons) {
                for (const lesson of chapter.lessons) {
                    // Check if progress is missing or completed is false
                    const isCompleted = lesson.progress?.completed === true;
                    console.log(`Checking lesson: ${lesson.title} (${lesson.id}), Completed: ${isCompleted}`);

                    if (!isCompleted) {
                        console.log("Found incomplete lesson, navigating to:", lesson.id);
                        navigate(`/modules/${moduleId}/lessons/${lesson.id}`);
                        return;
                    }
                }
            }
        }

        // Fallback: If we get here, either all are complete OR something is wrong.
        // Let's just go to the very first lesson of the first chapter to be safe.
        if (moduleData.chapters.length > 0 && moduleData.chapters[0].lessons && moduleData.chapters[0].lessons.length > 0) {
            const firstLessonId = moduleData.chapters[0].lessons[0].id;
            console.log("Fallback: Navigating to first lesson:", firstLessonId);
            navigate(`/modules/${moduleId}/lessons/${firstLessonId}`);
        } else {
            console.log("No lessons found in any chapter.");
            toast({
                title: "Error",
                description: "No lessons found in this module.",
                variant: "destructive"
            });
        }
    };

    const handleDriverComplete = () => {
        setShowDriver(false);
        // Here we would ideally save the "personalization" state
        toast({
            title: "Curriculum Personalized",
            description: "Your learning path has been updated.",
        });
        // Navigate to first lesson or refresh
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

    // Helper to check if a chapter is unlocked
    const isChapterUnlocked = (index: number) => {
        if (index === 0) return true; // First chapter always unlocked
        const prevChapter = chapters[index - 1];
        // Check if all lessons in previous chapter are completed
        // This requires 'progress' to be populated on lessons, which getModuleDetails does
        // But we need to make sure the service actually returns lesson progress in the chapters query
        // For now, we'll assume if any lesson in prev chapter is NOT complete, this one is locked.
        // NOTE: The current getModuleDetails might not return lesson progress. We might need to fetch it.
        // For this V1, let's assume simple logic: Unlocked if index == 0.
        // TODO: Implement robust progress check.
        return true; // Temporarily unlock all for testing flow
    };

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
                {chapters.map((chapter: any, index: number) => {
                    const unlocked = isChapterUnlocked(index);
                    return (
                        <Card key={chapter.id} className={!unlocked ? "opacity-75 bg-muted/50" : ""}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        {chapter.title}
                                        {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Chapter {index + 1}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{chapter.description}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {chapter.lessons.map((lesson: any) => (
                                        <div
                                            key={lesson.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border border-transparent transition-colors
                                                ${unlocked
                                                    ? "hover:bg-accent cursor-pointer hover:border-border"
                                                    : "cursor-not-allowed opacity-50"
                                                }`}
                                            onClick={() => unlocked && navigate(`/modules/${moduleId}/lessons/${lesson.id}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                    {lesson.progress?.completed ? (
                                                        <CheckCircle className="w-5 h-5" />
                                                    ) : (
                                                        <PlayCircle className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium">{lesson.title}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {lesson.progress?.completed ? "Completed" : "Start"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <CurriculumDriver
                isOpen={showDriver}
                onClose={() => setShowDriver(false)}
                onComplete={handleDriverComplete}
                moduleTitle={module.title}
                moduleId={moduleId}
            />

            <BottomNav />
        </div>
    );
}

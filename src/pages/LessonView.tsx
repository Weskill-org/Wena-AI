import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService } from "@/services/moduleService";
import { geminiLessonService } from "@/services/geminiLessonService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export default function LessonView() {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lesson, setLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (!lessonId) return;

        const fetchLesson = async () => {
            try {
                const data = await moduleService.getLesson(lessonId);
                setLesson(data);

                // If content is empty, generate it
                if (!data.content) {
                    generateContent(data);
                }
            } catch (error) {
                console.error("Error fetching lesson:", error);
                toast({
                    title: "Error",
                    description: "Failed to load lesson.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [lessonId]);

    const generateContent = async (lessonData: any) => {
        setGenerating(true);
        try {
            const content = await geminiLessonService.generateLessonContent(
                lessonData.title,
                lessonData.chapter.module.title,
                lessonData.chapter.title
            );

            // Update local state
            setLesson((prev: any) => ({ ...prev, content }));

            // Save to DB (optional, but good for caching)
            // For now we just display it, but in a real app we'd save it to the 'lessons' table
            await supabase
                .from("lessons" as any)
                .update({ content })
                .eq("id", lessonData.id);

        } catch (error) {
            console.error("Error generating content:", error);
            toast({
                title: "Generation Failed",
                description: "Could not generate lesson content using AI.",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleComplete = async () => {
        if (!lesson || !lessonId) return;
        setCompleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await moduleService.markLessonComplete(lessonId, user.id);
                setLesson((prev: any) => ({
                    ...prev,
                    progress: { ...prev.progress, completed: true }
                }));
                toast({
                    title: "Lesson Completed!",
                    description: "Great job! Progress saved.",
                });
            }
        } catch (error) {
            console.error("Error completing lesson:", error);
            toast({
                title: "Error",
                description: "Failed to save progress.",
                variant: "destructive",
            });
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
                <Button onClick={() => navigate(`/modules/${moduleId}`)}>Back to Module</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl pb-24">
            <Button variant="ghost" className="mb-6" onClick={() => navigate(`/modules/${moduleId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Module
            </Button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
                <div className="flex items-center text-muted-foreground text-sm">
                    <span>{lesson.chapter.module.title}</span>
                    <span className="mx-2">•</span>
                    <span>{lesson.chapter.title}</span>
                </div>
            </div>

            <Card className="mb-8">
                <CardContent className="pt-6">
                    {generating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">AI Buddy is writing your lesson...</p>
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>{lesson.content || "No content available."}</ReactMarkdown>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => generateContent(lesson)} disabled={generating}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate Content
                </Button>

                <Button
                    size="lg"
                    onClick={handleComplete}
                    disabled={completing || lesson.progress?.completed}
                    className={lesson.progress?.completed ? "bg-green-600 hover:bg-green-700" : ""}
                >
                    {lesson.progress?.completed ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" /> Completed
                        </>
                    ) : (
                        "Mark as Complete"
                    )}
                </Button>
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService } from "@/services/moduleService";
import { geminiLessonService } from "@/services/geminiLessonService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, RefreshCw, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import LessonQuiz from "@/components/modules/LessonQuiz";
import VoiceMode from "@/components/ui/VoiceMode";

export default function LessonView() {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lesson, setLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    useEffect(() => {
        if (!lessonId) return;

        const fetchLesson = async () => {
            try {
                const data = await moduleService.getLesson(lessonId);

                // Parse content if it's a string (legacy) or use as object
                let parsedContent = data.content;
                if (typeof data.content === 'string' && data.content.startsWith('{')) {
                    try {
                        parsedContent = JSON.parse(data.content);
                    } catch (e) {
                        // If parse fails, treat as markdown string (legacy)
                        parsedContent = { text_content: data.content };
                    }
                } else if (typeof data.content === 'string') {
                    parsedContent = { text_content: data.content };
                }

                setLesson({ ...data, content: parsedContent });

                // If content is empty OR it's just a simple string (summary), generate full content
                if (!data.content || (typeof data.content === 'string' && !data.content.startsWith('{'))) {
                    // Pass the existing content as summary if it exists
                    generateContent(data, typeof data.content === 'string' ? data.content : undefined);
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

    const generateContent = async (lessonData: any, summaryContext?: string) => {
        setGenerating(true);
        try {
            // Retrieve personalization context if available
            const personalizationContext = sessionStorage.getItem(`curriculum_context_${moduleId}`);

            const content = await geminiLessonService.generateLessonContent(
                lessonData.title,
                lessonData.chapter.module.title,
                lessonData.chapter.title,
                personalizationContext || undefined,
                summaryContext
            );

            // Update local state
            setLesson((prev: any) => ({ ...prev, content }));

            // Save to DB (stringify JSON for storage)
            await supabase
                .from("lessons" as any)
                .update({ content: JSON.stringify(content) })
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

    const { content } = lesson;
    const isStructured = content && typeof content === 'object' && content.text_content;

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

            {/* Voice Mode Integration (Placeholder for now, can be expanded) */}
            {/* <div className="mb-8 h-64 rounded-xl overflow-hidden">
                 <VoiceMode onDeductCredit={() => {}} hasCredits={true} />
            </div> */}

            <Card className="mb-8">
                <CardContent className="pt-6">
                    {generating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">
                                {typeof lesson.content === 'string' ? "AI Buddy is expading your lesson from the summary..." : "AI Buddy is writing your lesson..."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Image Placeholders */}
                            {isStructured && content.image_prompts && content.image_prompts.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {content.image_prompts.map((prompt: string, i: number) => (
                                        <div key={i} className="rounded-xl overflow-hidden shadow-lg border border-border group relative">
                                            <img
                                                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`}
                                                alt={prompt}
                                                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs text-white line-clamp-2">{prompt}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <ReactMarkdown>
                                    {isStructured ? content.text_content : (typeof content === 'string' ? content : "No content available.")}
                                </ReactMarkdown>
                            </div>

                            {/* Voice Script Section */}
                            {isStructured && content.voice_script && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mt-6">
                                    <h4 className="flex items-center text-blue-700 dark:text-blue-300 font-semibold mb-2">
                                        <Volume2 className="w-4 h-4 mr-2" /> AI Tutor Script
                                    </h4>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                                        "{content.voice_script}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quiz Section */}
            {isStructured && content.quiz && content.quiz.length > 0 && (
                <div className="mb-8">
                    {!showQuiz && !lesson.progress?.completed ? (
                        <Button className="w-full" size="lg" onClick={() => setShowQuiz(true)}>
                            Start Lesson Quiz
                        </Button>
                    ) : (
                        <LessonQuiz
                            quiz={content.quiz}
                            onComplete={handleComplete}
                        />
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mt-8">
                <Button variant="outline" onClick={() => generateContent(lesson)} disabled={generating}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Create my Lesson
                </Button>

                {!isStructured && (
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
                )}
            </div>
        </div>
    );
}

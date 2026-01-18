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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import VoiceMode from "@/components/ui/VoiceMode";

import { useAuth } from "@/hooks/useAuth";

export default function LessonView() {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth(); // Ensure we have user from hook
    const [lesson, setLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const queryClient = useQueryClient();
    // user is already declared above

    // --- Credit Logic (Moved to top) ---
    const { data: wallet } = useQuery({
        queryKey: ['wallet', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const credits = wallet?.credits || 0;

    const deductUsageMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) return;
            const { error } = await supabase.rpc('deduct_ai_credits', { amount: 1 });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error) => {
            console.error("Failed to deduct credit:", error);
        }
    });

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



    // Construct the Voice Mode prompt
    const personalizationContext = sessionStorage.getItem(`curriculum_context_${moduleId}`);
    const voiceInstruction = `
        You are an expert AI tutor. Your goal is to teach the user about: "${lesson.title}".
        Context: This lesson is part of the module "${lesson.chapter?.module?.title}" and chapter "${lesson.chapter?.title}".
        ${personalizationContext ? `User Personalization Context: ${personalizationContext}` : ""}
        
        Start by introducing the topic and then guide the user through the key concepts interactively.
        Explain concepts clearly, provide examples, and answer any questions the user might have.
        Your goal is to ensure the user understands the material.
        Keep your responses concise and conversational.
    `;

    const handleVoiceDeduct = () => {
        deductUsageMutation.mutate();
    };

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

            {/* Voice Mode Integration - Replaces Text Content */}
            <div className="mb-8 h-[600px] rounded-xl overflow-hidden shadow-2xl border border-border">
                <VoiceMode
                    onDeductCredit={handleVoiceDeduct}
                    hasCredits={credits > 0}
                    customInstruction={voiceInstruction}
                    modeName="AI Tutor"
                />
            </div>

            {/* Quiz Section - Keep this available manually */}
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
                {/* Removed Create Lesson Button */}

                <Button
                    size="lg"
                    onClick={handleComplete}
                    disabled={completing || lesson.progress?.completed}
                    className={lesson.progress?.completed ? "bg-green-600 hover:bg-green-700 w-full md:w-auto" : "w-full md:w-auto"}
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

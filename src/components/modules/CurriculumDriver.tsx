import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mic, Loader2 } from "lucide-react";
import CurriculumVoiceSession from "@/components/modules/CurriculumVoiceSession";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

interface CurriculumDriverProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    moduleTitle: string;
    moduleId: string; // Added moduleId to navigate/save context
}

export default function CurriculumDriver({ isOpen, onClose, onComplete, moduleTitle, moduleId }: CurriculumDriverProps) {
    const navigate = useNavigate();
    const [step, setStep] = useState<'intro' | 'voice' | 'generating'>('intro');
    const [persona, setPersona] = useState<string>("Learner");
    const [transcript, setTranscript] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchPersona();
        }
    }, [isOpen]);

    const fetchPersona = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('ai_personas')
                .select('persona_text')
                .eq('user_id', user.id)
                // .eq('is_active', true) // is_active might not exist either based on migration, checking...
                .limit(1)
                .single();

            if (data) {
                setPersona(data.persona_text || "Learner");
            }
        } catch (error) {
            console.error("Error fetching persona:", error);
        }
    };

    const handleStartVoice = () => {
        setStep('voice');
    };

    const handleVoiceComplete = () => {
        setStep('generating');

        // Save transcript/context to local storage or state to pass to LessonView
        // For simplicity, we'll use navigation state when we complete
        const contextSummary = transcript.join("\n");

        setTimeout(() => {
            onComplete(); // Close dialog
            // Navigate to first lesson with context
            // We need to find the first lesson ID. 
            // Since we don't have it here easily without fetching, 
            // we rely on the parent (ModuleView) to handle the "after complete" action 
            // OR we pass the context back to parent.
            // Let's pass it back via onComplete if we change the signature, 
            // or just save to sessionStorage for the next lesson load.
            sessionStorage.setItem(`curriculum_context_${moduleId}`, contextSummary);
            console.log("Personalization complete, closing driver...");
            onComplete();
        }, 1500);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Personalize Your Learning</DialogTitle>
                    <DialogDescription>
                        Let's tailor the "{moduleTitle}" module to your goals.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center min-h-[300px]">
                    {step === 'intro' && (
                        <div className="text-center space-y-4">
                            <div className="bg-primary/10 p-4 rounded-full inline-block">
                                <Mic className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-muted-foreground">
                                Our AI Coach will ask you a few quick questions to understand your current level and what you want to achieve.
                            </p>
                            <Button onClick={handleStartVoice} className="w-full">
                                Start Conversation
                            </Button>
                        </div>
                    )}

                    {step === 'voice' && (
                        <div className="w-full h-[400px] relative rounded-xl overflow-hidden">
                            <CurriculumVoiceSession
                                moduleTitle={moduleTitle}
                                persona={persona}
                                onTranscriptUpdate={setTranscript}
                                isActive={true}
                            />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                                <Button variant="secondary" size="sm" onClick={handleVoiceComplete}>
                                    I'm Done
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                            <p>Personalizing your curriculum...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

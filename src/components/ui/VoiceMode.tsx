import React, { useState, useEffect, useRef } from 'react';
import AiAvatar from './AiAvatar';
import { RolePicker } from './RolePicker';
import { GeminiLiveClient } from '@/services/liveService';
import { Sparkles, X, Coins, Timer } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { GradientButton } from "@/components/ui/gradient-button";

interface VoiceModeProps {
    onDeductCredit: () => void;
    hasCredits: boolean;
    personaContext?: string;
    customInstruction?: string;
    modeName?: string;
}

const ROLES: Record<string, string> = {
    'Mock Interviewer': `You are Wena, a professional Mock Interviewer. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India" You will always start to talk in English as its a professional Interviewer Role. 
    Module Logic:
    1. Start by strictly asking the user for their "Years of Experience" and "Role they are applying for". Do not proceed until you have this.
    2. Once received, conduct a detailed technical interview. Ask 10 questions one by one. Wait for the user's answer after each question.
    3. If the user gives a wrong answer, politely correct them with the right answer and explanation, then move to the next question directly without asking anything.
    4. Maintain a professional yet encouraging tone.
    5. At the very end of the interview (after 10 questions), provide a detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) based on their performance.
    6. Never get distracted by the user's unnecessary details. Stick to the role and push user to answer questions.`,

    'Career Counselor': `You are Wena, an expert Career Counselor. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India".
    Module Logic:
    1. Ask the user about their current skills, interests, and career goals.
    2. Provide personalized career guidance, suggesting roles, industries, and upskilling paths.
    3. Discuss market trends relevant to their field.
    4. Be supportive, insightful, and practical in your advice.
    5. Never get distracted by the user's unnecessary details. Stick to the role and push user to answer questions.`,

    'Coding Buddy': `You are Wena, a friendly Coding Buddy. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India".
    Module Logic:
    1. Ask the user which coding language they want to learn or understand.
    2. Ask for their current proficiency level (Beginner, Intermediate, Advanced).
    3. If they are a beginner, guide them through basics with examples.
    4. If they already know the basics, skip to higher-level concepts and allow them to set a custom difficulty for challenges/questions.
    5. Review their code snippets if provided and suggest optimizations.`,

    'Language Buddy': `You are Wena, a dedicated Language Buddy. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India".
    Module Logic:
    1. Ask the user which new language they want to learn.
    2. Ask what their native/mother tongue is.
    3. Start talking in their mother tongue and Teach the target language primarily by using examples and translations from their mother tongue only.
    4. Correct grammar and pronunciation (phonetically) in a gentle manner.
    5. Focus on conversational fluency and vocabulary building.
    6. Never get distracted by the user's unnecessary details. Stick to the role and move ahead in teaching the target language.
    7. Lead the convesation as a proffesional Language Tutor`,

    'Exam Buddy': `You are Wena, an intensive Exam Buddy. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India".
    Module Logic:
    1. Ask the user which exam they are preparing for (e.g., SAT, JEE, UPSC, University exams).
    2. Conduct rapid-fire question sessions testing key facts and concepts.
    3. Be strict about accuracy but encouraging about effort.
    4. Focus on high-yield topics and memory retention techniques.
    5. Keep interactions fast-paced to simulate exam pressure.`,

    'WeCare': `You are "WeCare", a soft and calming mental and physiological therapist identity of Wena. Your name is "WeCare". If asked about your model, reply: "Wena 2.0 AI, Made in India".
    Module Logic:
    1. Use a very soft, soothing, and empathetic tone.
    2. Listen actively to the user's worries or stresses.
    3. Provide comforting words, mindfulness exercises, or breathing techniques if needed.
    4. Goal is to reduce anxiety and make the user feel heard and supported.
    5. strictly avoid medical diagnoses; focus on emotional support and well-being.`
};

const VoiceMode: React.FC<VoiceModeProps> = ({ onDeductCredit, hasCredits, personaContext, customInstruction, modeName }) => {
    const [active, setActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('Mock Interviewer');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const liveClient = useRef<GeminiLiveClient | null>(null);
    const billingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (liveClient.current) {
                liveClient.current.disconnect();
            }
            if (billingInterval.current) clearInterval(billingInterval.current);
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, []);

    const handleToggle = async () => {
        if (isLoading) return;

        if (active) {
            liveClient.current?.disconnect();
            setActive(false);
            if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
            return;
        }

        if (!hasCredits) {
            setError("Insufficient credits. Please top up to use Voice Mode.");
            return;
        }

        // Show confirmation dialog if not custom instruction
        if (!customInstruction && !showConfirm) {
            setShowConfirm(true);
            return;
        }

        setShowConfirm(false);
        await startSession();
    };

    const startSession = async () => {

        if (active) {
            liveClient.current?.disconnect();
            setActive(false);
            return;
        }

        if (!hasCredits) {
            setError("Insufficient credits. Please top up to use Voice Mode.");
            return;
        }

        setIsLoading(true);
        setError(null);


        // Initialize Client
        if (!liveClient.current) {
            try {
                // Fetch API Key from Edge Function securely
                const { data, error: keyError } = await supabase.functions.invoke('get-gemini-key', {
                    body: { mode: 'get_key' }
                });

                if (keyError || !data?.apiKey) {
                    console.error("Failed to fetch API key:", keyError);
                    setError("Failed to retrieve API configurations.");
                    setIsLoading(false);
                    return;
                }


                let apiKey;
                try {
                    apiKey = atob(data.apiKey);

                } catch (e) {
                    console.error("Failed to decode API key:", e);
                    setError("Failed to decode configuration.");
                    setIsLoading(false);
                    return;
                }

                // Construct system instruction with user persona context
                let fullSystemInstruction = "";

                if (customInstruction) {
                    fullSystemInstruction = customInstruction;
                } else {
                    const roleInstruction = ROLES[selectedRole];
                    fullSystemInstruction = personaContext
                        ? `${roleInstruction}\n\nIMPORTANT USER CONTEXT (Use this to personalize the interaction):\n${personaContext}`
                        : roleInstruction;
                }

                liveClient.current = new GeminiLiveClient({
                    apiKey,
                    systemInstruction: fullSystemInstruction,
                    onConnect: () => {
                        setActive(true);
                        setIsLoading(false);
                        setSessionSeconds(0);
                        const roleName = modeName || selectedRole;
                        setTranscript(prev => [...prev, `System: Connected as ${roleName}`]);

                        // Session timer
                        timerInterval.current = setInterval(() => {
                            setSessionSeconds(s => s + 1);
                        }, 1000);

                        // Deduct credit immediately on start, then every minute
                        onDeductCredit();
                        billingInterval.current = setInterval(() => {
                            onDeductCredit();
                        }, 60000);
                    },
                    onResponse: () => {
                        // Previously deducted here, now handled by interval
                    },
                    onDisconnect: () => {
                        setActive(false);
                        setIsLoading(false);
                        setVolume(0);
                        setTranscript(prev => [...prev, "System: Disconnected."]);
                        liveClient.current = null;

                        if (billingInterval.current) { clearInterval(billingInterval.current); billingInterval.current = null; }
                        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
                    },
                    onVolumeChange: (vol) => {
                        setVolume(vol);
                    },
                    onError: (err) => {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        setError(`Connection failed: ${errorMessage}`);
                        console.error(err);
                        setActive(false);
                        setIsLoading(false);
                        liveClient.current = null;

                        if (billingInterval.current) {
                            clearInterval(billingInterval.current);
                            billingInterval.current = null;
                        }
                    }
                });
            } catch (err) {
                console.error("Error initializing voice mode:", err);
                setError("Failed to initialize voice service.");
                setIsLoading(false);
                return;
            }
        }

        try {
            await liveClient.current.connect();
        } catch (err) {
            console.error("Connection error:", err);
            setError("Failed to connect.");
            setIsLoading(false);
        }
    };

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="min-h-full flex flex-col items-center relative bg-background px-4 pb-24 md:pb-10">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-secondary/5 rounded-full blur-3xl" />
            </div>

            <div className="z-10 flex flex-col items-center space-y-4 md:space-y-8 my-auto py-10 w-full">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl md:text-3xl font-light text-foreground tracking-wide">Wena AI</h2>
                    <p className="text-muted-foreground text-sm md:text-base">
                        {isLoading
                            ? 'Connecting...'
                            : (active
                                ? `Speaking with ${modeName || selectedRole}...`
                                : (customInstruction ? `Tap to start ${modeName || 'Lesson'}` : 'Select a role and tap to start')
                            )
                        }
                    </p>
                </div>

                {/* Session Timer */}
                {active && (
                    <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-sm border border-border rounded-full px-4 py-1.5">
                        <Timer className="w-3.5 h-3.5 text-accent" />
                        <span className="text-sm font-mono text-foreground">{formatTime(sessionSeconds)}</span>
                        <span className="text-[10px] text-muted-foreground">• 1 credit/min</span>
                    </div>
                )}

                <AiAvatar
                    isActive={active}
                    volume={volume}
                    onClick={handleToggle}
                    isLoading={isLoading}
                />

                {/* Role Picker - Card-based - Only show if no custom instruction */}
                {!customInstruction && (
                    <RolePicker
                        roles={Object.keys(ROLES)}
                        selected={selectedRole}
                        onSelect={setSelectedRole}
                        disabled={active}
                    />
                )}

                {error && (
                    <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 border border-destructive/50 text-destructive px-4 py-2 rounded-lg flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 text-sm">
                        <X size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {active && (
                    <div className="absolute top-4 right-4 md:top-10 md:right-10 bg-surface/80 backdrop-blur-md p-3 md:p-4 rounded-xl border border-border max-w-[200px] md:max-w-xs hidden md:block animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center space-x-2 text-secondary mb-2">
                            <Sparkles size={14} />
                            <span className="text-xs font-bold uppercase">Live Transcript</span>
                        </div>
                        <div className="h-24 md:h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                            {transcript.slice(-5).map((t, i) => (
                                <p key={i} className="opacity-80">{t}</p>
                            ))}
                            {transcript.length === 0 && <p className="italic opacity-50">Listening...</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Session Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-accent" />
                            Start Voice Session
                        </DialogTitle>
                        <DialogDescription>
                            You're about to start a session as <strong>{selectedRole}</strong>.
                            This costs <strong>1 credit per minute</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-surface transition-smooth"
                        >
                            Cancel
                        </button>
                        <GradientButton
                            onClick={async () => {
                                setShowConfirm(false);
                                await startSession();
                            }}
                            className="flex-1"
                        >
                            Start Session
                        </GradientButton>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VoiceMode;

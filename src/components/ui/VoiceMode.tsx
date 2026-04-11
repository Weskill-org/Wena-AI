import React, { useState, useEffect, useRef, useCallback } from 'react';
import AiAvatar from './AiAvatar';
import { RolePicker } from './RolePicker';
import { GeminiLiveClient } from '@/services/liveService';
import { Sparkles, X, Coins, Timer, Video, VideoOff, Monitor, MonitorOff, MessageSquare, StopCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from 'framer-motion';
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

type TranscriptMessage = {
    role: 'user' | 'model' | 'system';
    text: string;
};

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
    5. Review their code snippets if provided and suggest optimizations.
    6. If camera or screen share is enabled, help them debug the code they are showing you.`,

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
    5. Keep interactions fast-paced to simulate exam pressure.
    6. If camera or screen share is enabled, review the study material or notes they are showing you.`,

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
    const [showConfirm, setShowConfirm] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    // New: Media & Transcript state
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);

    const liveClient = useRef<GeminiLiveClient | null>(null);
    const billingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // New: Video/Screen refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript to bottom
    useEffect(() => {
        if (transcriptEndRef.current && showTranscript) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcriptMessages, showTranscript]);

    // Handle camera/screen stream start/stop
    useEffect(() => {
        const startStream = async () => {
            try {
                // Stop existing stream first
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }

                if (isScreenSharing) {
                    streamRef.current = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    // Handle user stopping screen share via browser UI
                    streamRef.current.getVideoTracks()[0]?.addEventListener('ended', () => {
                        setIsScreenSharing(false);
                    });
                } else if (isCameraOn) {
                    streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
                }

                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                } else if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            } catch (err) {
                console.error("Media Error:", err);
                setIsCameraOn(false);
                setIsScreenSharing(false);
            }
        };

        if (isCameraOn || isScreenSharing) {
            startStream();
        } else {
            // Clean up if both are off
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }

        return () => {
            // Don't clean up on every render, only when component unmounts
        };
    }, [isCameraOn, isScreenSharing]);

    // Frame capture loop — send video frames to Gemini when connected
    useEffect(() => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }

        if (active && (isCameraOn || isScreenSharing) && liveClient.current) {
            frameIntervalRef.current = setInterval(() => {
                if (videoRef.current && canvasRef.current && liveClient.current) {
                    const context = canvasRef.current.getContext('2d');
                    if (context) {
                        canvasRef.current.width = 320;
                        canvasRef.current.height = 240;
                        context.drawImage(videoRef.current, 0, 0, 320, 240);
                        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                        liveClient.current.sendVideoFrame(base64Data);
                    }
                }
            }, 1000); // Send frame every second
        }

        return () => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
        };
    }, [active, isCameraOn, isScreenSharing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (liveClient.current) {
                liveClient.current.disconnect();
            }
            if (billingInterval.current) clearInterval(billingInterval.current);
            if (timerInterval.current) clearInterval(timerInterval.current);
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const handleStop = useCallback(() => {
        liveClient.current?.disconnect();
        setActive(false);
        setIsCameraOn(false);
        setIsScreenSharing(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
        if (billingInterval.current) { clearInterval(billingInterval.current); billingInterval.current = null; }
    }, []);

    const handleToggle = async () => {
        if (isLoading) return;

        if (active) {
            handleStop();
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
            handleStop();
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

                // Add camera/screen awareness to instruction
                const visualContext = "\n\nYou have the ability to see the user's camera or screen if they share it. If you receive visual input, acknowledge and use it contextually in your responses. For example, if you see code on screen, help debug it. If you see notes, help study them.";
                fullSystemInstruction += visualContext;

                liveClient.current = new GeminiLiveClient({
                    apiKey,
                    systemInstruction: fullSystemInstruction,
                    onConnect: () => {
                        setActive(true);
                        setIsLoading(false);
                        setSessionSeconds(0);
                        const roleName = modeName || selectedRole;
                        setTranscriptMessages(prev => [...prev, { role: 'system', text: `Connected as ${roleName}` }]);

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
                        // Handled by interval billing
                    },
                    onDisconnect: () => {
                        setActive(false);
                        setIsLoading(false);
                        setVolume(0);
                        setTranscriptMessages(prev => [...prev, { role: 'system', text: 'Session ended.' }]);
                        liveClient.current = null;

                        if (billingInterval.current) { clearInterval(billingInterval.current); billingInterval.current = null; }
                        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
                    },
                    onVolumeChange: (vol) => {
                        setVolume(vol);
                    },
                    onUserTranscript: (text) => {
                        setTranscriptMessages(prev => [...prev, { role: 'user', text }]);
                    },
                    onModelTranscript: (text) => {
                        setTranscriptMessages(prev => [...prev, { role: 'model', text }]);
                    },
                    onModelSpeakingChange: (_speaking) => {
                        // Volume change already handles avatar animation
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

    const hasVisualInput = isCameraOn || isScreenSharing;

    return (
        <div className="min-h-full flex flex-col items-center relative bg-background px-4 pb-24 md:pb-10">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-secondary/5 rounded-full blur-3xl" />
            </div>

            <div className="z-10 flex flex-col items-center space-y-4 md:space-y-6 my-auto py-6 w-full">
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

                {/* Session Timer & Media Controls Bar */}
                {active && (
                    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                        {/* Timer */}
                        <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-sm border border-border rounded-full px-4 py-1.5">
                            <Timer className="w-3.5 h-3.5 text-accent" />
                            <span className="text-sm font-mono text-foreground">{formatTime(sessionSeconds)}</span>
                            <span className="text-[10px] text-muted-foreground">• 1 credit/min</span>
                        </div>

                        {/* Media Controls */}
                        <div className="flex items-center gap-2">
                            {/* Camera Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => {
                                    setIsCameraOn(!isCameraOn);
                                    if (!isCameraOn) setIsScreenSharing(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all duration-300 ${
                                    isCameraOn
                                        ? 'bg-primary/15 border-primary/50 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
                                        : 'bg-surface/60 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                }`}
                                title="Toggle Camera"
                            >
                                {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isCameraOn ? 'Camera On' : 'Camera'}</span>
                            </motion.button>

                            {/* Screen Share Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => {
                                    setIsScreenSharing(!isScreenSharing);
                                    if (!isScreenSharing) setIsCameraOn(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all duration-300 ${
                                    isScreenSharing
                                        ? 'bg-secondary/15 border-secondary/50 text-secondary shadow-[0_0_12px_hsl(var(--secondary)/0.2)]'
                                        : 'bg-surface/60 border-border text-muted-foreground hover:border-secondary/30 hover:text-foreground'
                                }`}
                                title="Toggle Screen Share"
                            >
                                {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isScreenSharing ? 'Sharing' : 'Screen'}</span>
                            </motion.button>

                            {/* Transcript Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setShowTranscript(!showTranscript)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all duration-300 ${
                                    showTranscript
                                        ? 'bg-accent/15 border-accent/50 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.2)]'
                                        : 'bg-surface/60 border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'
                                }`}
                                title="Toggle Transcript"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Chat</span>
                            </motion.button>

                            {/* Divider */}
                            <div className="w-px h-6 bg-border mx-1" />

                            {/* End Session */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={handleStop}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-300"
                                title="End Session"
                            >
                                <StopCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">End</span>
                            </motion.button>
                        </div>

                        {/* Visual Input Indicator */}
                        <AnimatePresence>
                            {hasVisualInput && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCameraOn ? 'bg-primary' : 'bg-secondary'}`} />
                                    {isCameraOn ? 'Camera feed active — AI can see you' : 'Screen share active — AI can see your screen'}
                                </motion.div>
                            )}
                        </AnimatePresence>
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
            </div>

            {/* Video Preview PIP (Picture-in-Picture) */}
            <AnimatePresence>
                {hasVisualInput && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-30 w-36 md:w-52 aspect-video rounded-2xl overflow-hidden border border-border shadow-2xl bg-black"
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Label Badge */}
                        <div className="absolute top-1.5 left-1.5">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCameraOn ? 'bg-primary' : 'bg-secondary'}`} />
                                <span className="text-[9px] text-white font-bold uppercase tracking-wider">
                                    {isScreenSharing ? 'Screen' : 'Camera'}
                                </span>
                            </div>
                        </div>
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsCameraOn(false);
                                setIsScreenSharing(false);
                            }}
                            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live Transcript Sidebar */}
            <AnimatePresence>
                {showTranscript && active && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 bottom-0 w-80 md:w-96 glass border-l border-border z-40 flex flex-col"
                    >
                        {/* Transcript Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Live Transcript</h3>
                                    <p className="text-[10px] text-muted-foreground">Powered by Gemini 3.1 Flash</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTranscript(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Transcript Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {transcriptMessages.length === 0 && (
                                <div className="text-center mt-12">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                                    <p className="text-sm text-muted-foreground italic">Transcript will appear here as you speak...</p>
                                </div>
                            )}
                            {transcriptMessages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex flex-col ${
                                        msg.role === 'user' ? 'items-end' :
                                        msg.role === 'system' ? 'items-center' : 'items-start'
                                    }`}
                                >
                                    {msg.role === 'system' ? (
                                        <div className="text-[10px] text-muted-foreground/60 italic py-1">
                                            {msg.text}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                                msg.role === 'user'
                                                    ? 'bg-primary/15 text-foreground rounded-br-md'
                                                    : 'bg-surface border border-border text-foreground rounded-bl-md'
                                            }`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">
                                                {msg.role === 'user' ? 'You' : 'Wena AI'}
                                            </span>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Transcript Footer */}
                        <div className="p-3 border-t border-border flex-shrink-0">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    Live
                                </div>
                                <span>{transcriptMessages.filter(m => m.role !== 'system').length} messages</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Canvas for Frame Capture */}
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />

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

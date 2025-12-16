import React, { useState, useEffect, useRef } from 'react';
import VoiceOrb from './VoiceOrb';
import { GeminiLiveClient } from '@/services/liveService';
import { Sparkles, X } from 'lucide-react';

interface VoiceModeProps {
    onDeductCredit: () => void;
    hasCredits: boolean;
    personaContext?: string;
}

const ROLES: Record<string, string> = {
    'Mock Interviewer': `You are Wena, a professional Mock Interviewer. Your name is "Wena". If asked about your model, reply: "Wena 2.0 AI, Made in India". 
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

const VoiceMode: React.FC<VoiceModeProps> = ({ onDeductCredit, hasCredits, personaContext }) => {
    const [active, setActive] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('Mock Interviewer');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);
    const liveClient = useRef<GeminiLiveClient | null>(null);
    const billingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (liveClient.current) {
                liveClient.current.disconnect();
            }
            if (billingInterval.current) {
                clearInterval(billingInterval.current);
            }
        };
    }, []);

    const handleToggle = async () => {
        if (active) {
            liveClient.current?.disconnect();
            setActive(false);
            return;
        }

        if (!hasCredits) {
            setError("Insufficient credits. Please top up to use Voice Mode.");
            return;
        }


        // Initialize Client
        if (!liveClient.current) {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            if (!apiKey) {
                setError("API Key not found.");
                return;
            }

            // Construct system instruction with user persona context
            const roleInstruction = ROLES[selectedRole];
            const fullSystemInstruction = personaContext
                ? `${roleInstruction}\n\nIMPORTANT USER CONTEXT (Use this to personalize the interaction):\n${personaContext}`
                : roleInstruction;

            liveClient.current = new GeminiLiveClient({
                apiKey,
                systemInstruction: fullSystemInstruction,
                onConnect: () => {
                    setActive(true);
                    setTranscript(prev => [...prev, `System: Connected as ${selectedRole}`]);

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
                    setVolume(0);
                    setTranscript(prev => [...prev, "System: Disconnected."]);
                    // Reset client so we can re-init with new role if needed next time
                    liveClient.current = null;

                    if (billingInterval.current) {
                        clearInterval(billingInterval.current);
                        billingInterval.current = null;
                    }
                },
                onVolumeChange: (vol) => {
                    setVolume(vol);
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    setError(`Connection failed: ${errorMessage}`);
                    console.error(err);
                    setActive(false);
                    liveClient.current = null;

                    if (billingInterval.current) {
                        clearInterval(billingInterval.current);
                        billingInterval.current = null;
                    }
                }
            });
        }

        await liveClient.current.connect();
    };

    return (
        <div className="h-full flex flex-col items-center justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl"></div>
            </div>

            <div className="z-10 flex flex-col items-center space-y-12">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-light text-white tracking-wide">Wena AI</h2>
                    <p className="text-slate-400">
                        {active ? `Speaking with ${selectedRole}...` : 'Select a role and tap the orb to start'}
                    </p>
                </div>

                <VoiceOrb
                    isActive={active}
                    volume={volume}
                    onClick={handleToggle}
                />

                {/* Role Chips */}
                <div className="flex gap-3 flex-wrap justify-center max-w-md">
                    {Object.keys(ROLES).map((role) => (
                        <button
                            key={role}
                            onClick={() => !active && setSelectedRole(role)}
                            disabled={active}
                            className={`px-4 py-2 rounded-full border text-sm transition-all duration-300
                        ${selectedRole === role
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-105'
                                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-cyan-500/50'
                                }
                        ${active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="absolute bottom-10 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-lg flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
                        <X size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {active && (
                    <div className="absolute top-10 right-10 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 max-w-xs hidden md:block animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                            <Sparkles size={16} />
                            <span className="text-xs font-bold uppercase">Live Transcript</span>
                        </div>
                        <div className="h-32 overflow-y-auto text-xs text-slate-300 space-y-1 scrollbar-hide">
                            {transcript.slice(-5).map((t, i) => (
                                <p key={i} className="opacity-80">{t}</p>
                            ))}
                            {transcript.length === 0 && <p className="italic opacity-50">Listening...</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceMode;

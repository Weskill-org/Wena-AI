import React, { useState, useEffect, useRef } from 'react';
import VoiceOrb from './VoiceOrb';
import { GeminiLiveClient } from '@/services/liveService';
import { Sparkles, X } from 'lucide-react';

interface VoiceModeProps {
    onDeductCredit: () => void;
    hasCredits: boolean;
}

const ROLES: Record<string, string> = {
    'Exam Coach': 'You are an intensive Exam Coach. Your goal is to prepare the student for upcoming tests. Ask rapid-fire questions, focus on key facts, and provide immediate feedback. Be strict but encouraging. Keep responses short.',
    'Math Tutor': 'You are a patient Math Tutor. Explain concepts step-by-step. If the student is stuck, provide hints rather than the answer. Use analogies to explain complex topics.',
    'Language Buddy': 'You are a friendly Language Buddy. Converse primarily in Spanish (unless asked otherwise). Correct grammar mistakes gently and teach new vocabulary in context.'
};

const VoiceMode: React.FC<VoiceModeProps> = ({ onDeductCredit, hasCredits }) => {
    const [active, setActive] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('Exam Coach');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);
    const liveClient = useRef<GeminiLiveClient | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (liveClient.current) {
                liveClient.current.disconnect();
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

        onDeductCredit();
        setError(null);

        // Initialize Client
        if (!liveClient.current) {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            if (!apiKey) {
                setError("API Key not found.");
                return;
            }

            liveClient.current = new GeminiLiveClient({
                apiKey,
                systemInstruction: ROLES[selectedRole],
                onConnect: () => {
                    setActive(true);
                    setTranscript(prev => [...prev, `System: Connected as ${selectedRole}`]);
                },
                onDisconnect: () => {
                    setActive(false);
                    setVolume(0);
                    setTranscript(prev => [...prev, "System: Disconnected."]);
                    // Reset client so we can re-init with new role if needed next time
                    liveClient.current = null;
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
                    <h2 className="text-3xl font-light text-white tracking-wide">AI Learning Companion</h2>
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
import React, { useState, useEffect, useRef } from 'react';
import AiAvatar from '@/components/ui/AiAvatar';
import { GeminiLiveClient } from '@/services/liveService';
import { Sparkles, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface CurriculumVoiceSessionProps {
    moduleTitle: string;
    persona: string;
    onTranscriptUpdate: (transcript: string[]) => void;
    isActive: boolean;
}

const CurriculumVoiceSession: React.FC<CurriculumVoiceSessionProps> = ({ moduleTitle, persona, onTranscriptUpdate, isActive }) => {
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);
    const liveClient = useRef<GeminiLiveClient | null>(null);

    useEffect(() => {
        if (isActive) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [isActive]);

    const connect = async () => {
        if (liveClient.current) return;

        try {
            const { data, error: keyError } = await supabase.functions.invoke('get-gemini-key', {
                body: { mode: 'get_key' }
            });

            if (keyError || !data?.apiKey) {
                console.error("Failed to fetch API key:", keyError);
                setError("Failed to retrieve API configurations.");
                return;
            }

            console.log("Raw API Key from server:", data.apiKey); // DEBUG
            let apiKey;
            try {
                apiKey = atob(data.apiKey);
                console.log("Decoded API Key (first 5 chars):", apiKey.substring(0, 5)); // DEBUG
            } catch (e) {
                console.error("Failed to decode API key:", e);
                setError("Failed to decode configuration.");
                return;
            }

            const systemInstruction = `You are a Curriculum Guide for the learning module "${moduleTitle}". The user's persona is "${persona}". Your goal is to ask 2-3 relevant questions to understand their specific needs and tailor the first lesson. Be concise, friendly, and focused. Do not lecture; just gather information to personalize the learning experience.`;

            liveClient.current = new GeminiLiveClient({
                apiKey,
                systemInstruction,
                onConnect: () => {
                    setTranscript(prev => [...prev, `System: Connected. Personalizing for ${moduleTitle}...`]);
                },
                onDisconnect: () => {
                    setVolume(0);
                    setTranscript(prev => [...prev, "System: Disconnected."]);
                    liveClient.current = null;
                },
                onVolumeChange: (vol) => {
                    setVolume(vol);
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    setError(`Connection failed: ${errorMessage}`);
                    console.error(err);
                    liveClient.current = null;
                }
            });

            try {
                await liveClient.current.connect();
            } catch (err) {
                setError("Failed to connect to Voice AI.");
                console.error(err);
            }

        } catch (err) {
            console.error("Error connecting to voice session:", err);
            setError("Failed to initialize voice session.");
        }
    };

    const disconnect = () => {
        if (liveClient.current) {
            liveClient.current.disconnect();
            liveClient.current = null;
        }
    };

    // Sync transcript to parent
    useEffect(() => {
        onTranscriptUpdate(transcript);
    }, [transcript, onTranscriptUpdate]);

    return (
        <div className="h-full flex flex-col items-center justify-center relative bg-slate-950 rounded-xl overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-900/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-900/20 rounded-full blur-3xl"></div>
            </div>

            <div className="z-10 flex flex-col items-center space-y-8">
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-light text-white tracking-wide">Curriculum Guide</h3>
                    <p className="text-slate-400 text-sm">
                        {isActive ? `Discussing ${moduleTitle}...` : 'Connecting...'}
                    </p>
                </div>

                <AiAvatar
                    isActive={isActive}
                    volume={volume}
                    onClick={() => { }}
                />

                {error && (
                    <div className="absolute bottom-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center space-x-2 text-xs">
                        <X size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Live Transcript Snippet */}
                <div className="w-64 h-24 overflow-y-auto text-xs text-slate-400 text-center space-y-1 scrollbar-hide px-4">
                    {transcript.slice(-3).map((t, i) => (
                        <p key={i} className="opacity-80">{t}</p>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CurriculumVoiceSession;

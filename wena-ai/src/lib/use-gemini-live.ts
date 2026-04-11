
import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AudioRecorder, AudioPlayer } from './audio-processor';

export type Message = {
  role: 'user' | 'model';
  text: string;
};

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const connect = useCallback(async (systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    playerRef.current = new AudioPlayer();
    recorderRef.current = new AudioRecorder((base64Data) => {
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      }
    });

    const sessionPromise = ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          setIsConnected(true);
          recorderRef.current?.start();
        },
        onmessage: async (message: any) => {
          // Handle audio output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            setIsModelSpeaking(true);
            playerRef.current?.playChunk(base64Audio);
            
            // Simple volume estimation for lip sync
            const binary = window.atob(base64Audio);
            let sum = 0;
            for (let i = 0; i < binary.length; i += 2) {
              const val = (binary.charCodeAt(i) | (binary.charCodeAt(i+1) << 8));
              sum += Math.abs(val > 32767 ? val - 65536 : val);
            }
            setVolume(sum / (binary.length / 2) / 32768);
          }

          // Handle transcription
          const userTranscription = message.serverContent?.inputAudioTranscription?.text;
          if (userTranscription) {
            setMessages(prev => [...prev, { role: 'user', text: userTranscription }]);
          }

          const modelTranscription = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
          if (modelTranscription) {
            setMessages(prev => [...prev, { role: 'model', text: modelTranscription }]);
          }

          // Handle turn complete
          if (message.serverContent?.turnComplete) {
            setIsModelSpeaking(false);
            setVolume(0);
          }

          // Handle interruption
          if (message.serverContent?.interrupted) {
            playerRef.current?.stop();
            setIsModelSpeaking(false);
            setVolume(0);
          }
        },
        onclose: () => {
          setIsConnected(false);
          recorderRef.current?.stop();
        },
        onerror: (error) => {
          console.error("Gemini Live Error:", error);
          setIsConnected(false);
        }
      }
    });

    sessionRef.current = await sessionPromise;
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    recorderRef.current?.stop();
    playerRef.current?.stop();
    setIsConnected(false);
  }, []);

  const sendVideoFrame = useCallback((base64Data: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        video: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }, [isConnected]);

  return {
    isConnected,
    messages,
    isModelSpeaking,
    volume,
    connect,
    disconnect,
    sendVideoFrame
  };
}

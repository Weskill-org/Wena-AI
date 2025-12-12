import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Audio Context Global References to prevent garbage collection issues
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let inputSource: MediaStreamAudioSourceNode | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

export interface LiveClientOptions {
    apiKey: string;
    systemInstruction?: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onVolumeChange?: (volume: number) => void;
    onError?: (error: any) => void;
    onResponse?: () => void;
}

// Utility to encode audio data for Gemini
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Utility to decode audio data from Gemini
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export class GeminiLiveClient {
    private ai: GoogleGenAI;
    private sessionPromise: Promise<any> | null = null;
    private config: LiveClientOptions;
    private active: boolean = false;

    constructor(config: LiveClientOptions) {
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async connect() {
        if (this.active) return;

        try {
            // Initialize Audio Contexts
            inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            // Get Microphone Access
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Start Gemini Session
            this.sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live Session Opened');
                        this.active = true;
                        this.config.onConnect?.();

                        // Setup Input Stream
                        if (inputAudioContext && mediaStream) {
                            inputSource = inputAudioContext.createMediaStreamSource(mediaStream);
                            // Using ScriptProcessor as per guidelines example
                            scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                if (!this.active) return;

                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                                // Simple volume calculation for UI
                                let sum = 0;
                                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                                const rms = Math.sqrt(sum / inputData.length);
                                this.config.onVolumeChange?.(rms);

                                const pcmBlob = createBlob(inputData);

                                this.sessionPromise?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };

                            inputSource.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContext.destination);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (!outputAudioContext) return;

                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);

                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                outputAudioContext,
                                24000,
                                1
                            );

                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => {
                                sources.delete(source);
                            });

                            source.start(nextStartTime);
                            nextStartTime = nextStartTime + audioBuffer.duration;
                            sources.add(source);

                            // Mock volume for model talking
                            this.config.onVolumeChange?.(0.5);
                            this.config.onResponse?.();

                        }

                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            for (const source of sources) {
                                source.stop();
                                sources.delete(source);
                            }
                            nextStartTime = 0;
                        }
                    },
                    onclose: () => {
                        console.log('Gemini Live Session Closed');
                        this.disconnect();
                    },
                    onerror: (e) => {
                        console.error('Gemini Live Session Error', e);
                        this.config.onError?.(e);
                        this.disconnect();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    },
                    systemInstruction: this.config.systemInstruction || "You are a helpful, encouraging, and knowledgeable AI student companion. Keep your responses concise and conversational.",
                }
            });

        } catch (error) {
            console.error("Failed to connect to Live API", error);
            this.config.onError?.(error);
            this.disconnect();
        }
    }

    disconnect() {
        this.active = false;

        // Stop Microphone
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        // Disconnect Input Nodes
        if (inputSource) inputSource.disconnect();
        if (scriptProcessor) scriptProcessor.disconnect();
        if (inputAudioContext) inputAudioContext.close();

        // Stop Output
        sources.forEach(source => source.stop());
        sources.clear();
        if (outputAudioContext) outputAudioContext.close();

        this.config.onDisconnect?.();

        // Note: session.close() is not available on the Promise, 
        // relying on garbage collection and connection drop
    }
}

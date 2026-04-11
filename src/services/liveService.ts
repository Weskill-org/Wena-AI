import { GoogleGenAI, Modality } from '@google/genai';

export interface LiveClientOptions {
    apiKey: string;
    systemInstruction?: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onVolumeChange?: (volume: number) => void;
    onError?: (error: any) => void;
    onResponse?: () => void;
    onUserTranscript?: (text: string) => void;
    onModelTranscript?: (text: string) => void;
    onModelSpeakingChange?: (speaking: boolean) => void;
}

/**
 * AudioRecorder — Records mic audio at 16kHz PCM and sends base64 chunks via callback.
 * Matches wena-ai's AudioRecorder for lowest latency.
 */
class AudioRecorder {
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private onAudioData: (base64Data: string) => void;

    constructor(onAudioData: (base64Data: string) => void) {
        this.onAudioData = onAudioData;
    }

    async start() {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = this.float32ToInt16(inputData);
            const base64Data = this.arrayBufferToBase64(pcmData.buffer);
            this.onAudioData(base64Data);
        };
    }

    stop() {
        this.processor?.disconnect();
        this.source?.disconnect();
        this.stream?.getTracks().forEach(t => t.stop());
        this.audioContext?.close();
        this.audioContext = null;
        this.stream = null;
        this.processor = null;
        this.source = null;
    }

    private float32ToInt16(buffer: Float32Array): Int16Array {
        const l = buffer.length;
        const buf = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            buf[i] = Math.min(1, buffer[i]) * 0x7FFF;
        }
        return buf;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

/**
 * AudioPlayer — Plays back 24kHz PCM audio chunks from Gemini response.
 * Matches wena-ai's AudioPlayer for minimal latency playback.
 */
class AudioPlayer {
    private audioContext: AudioContext | null = null;
    private nextStartTime: number = 0;
    private sampleRate: number = 24000;

    constructor() {
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
        this.nextStartTime = this.audioContext.currentTime;
    }

    playChunk(base64Data: string) {
        if (!this.audioContext) return;

        const binary = window.atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 0x7FFF;
        }

        const buffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
        buffer.getChannelData(0).set(float32Data);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
        source.start(startTime);
        this.nextStartTime = startTime + buffer.duration;
    }

    stop() {
        this.audioContext?.close();
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
        this.nextStartTime = this.audioContext.currentTime;
    }

    destroy() {
        this.audioContext?.close();
        this.audioContext = null;
    }
}

export class GeminiLiveClient {
    private ai: GoogleGenAI;
    private session: any = null;              // Resolved session — NO more Promise on every send
    private recorder: AudioRecorder | null = null;
    private player: AudioPlayer | null = null;
    private config: LiveClientOptions;
    private active: boolean = false;

    constructor(config: LiveClientOptions) {
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async connect() {
        if (this.active) return;

        try {
            // Pre-initialize player so it's ready for first audio chunk
            this.player = new AudioPlayer();

            // Setup recorder — sends audio directly to resolved session (no .then())
            this.recorder = new AudioRecorder((base64Data) => {
                if (this.session && this.active) {
                    this.session.sendRealtimeInput({
                        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                    });
                }
            });

            // Connect to Gemini Live — await the session ONCE
            const sessionPromise = this.ai.live.connect({
                model: 'gemini-3.1-flash-live-preview',
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live Session Opened');
                        this.active = true;
                        this.config.onConnect?.();

                        // Start recording mic immediately on open
                        this.recorder?.start();
                    },
                    onmessage: (message: any) => {
                        // Handle audio output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            this.config.onModelSpeakingChange?.(true);
                            this.player?.playChunk(base64Audio);

                            // Real volume estimation from audio data (matches wena-ai)
                            const binary = window.atob(base64Audio);
                            let sum = 0;
                            for (let i = 0; i < binary.length; i += 2) {
                                const val = (binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8));
                                sum += Math.abs(val > 32767 ? val - 65536 : val);
                            }
                            const vol = sum / (binary.length / 2) / 32768;
                            this.config.onVolumeChange?.(vol);
                            this.config.onResponse?.();
                        }

                        // Handle user transcription
                        const userTranscription = message.serverContent?.inputAudioTranscription?.text;
                        if (userTranscription) {
                            this.config.onUserTranscript?.(userTranscription);
                        }

                        // Handle model transcription
                        const modelTranscription = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
                        if (modelTranscription) {
                            this.config.onModelTranscript?.(modelTranscription);
                        }

                        // Handle turn complete
                        if (message.serverContent?.turnComplete) {
                            this.config.onModelSpeakingChange?.(false);
                            this.config.onVolumeChange?.(0);
                        }

                        // Handle interruption
                        if (message.serverContent?.interrupted) {
                            this.player?.stop();
                            this.config.onModelSpeakingChange?.(false);
                            this.config.onVolumeChange?.(0);
                        }
                    },
                    onclose: () => {
                        console.log('Gemini Live Session Closed');
                        this.cleanup();
                        this.config.onDisconnect?.();
                    },
                    onerror: (e) => {
                        console.error('Gemini Live Session Error', e);
                        this.config.onError?.(e);
                        this.cleanup();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    },
                    systemInstruction: this.config.systemInstruction || "You are a helpful, encouraging, and knowledgeable AI student companion. Keep your responses concise and conversational.",
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                }
            });

            // CRITICAL: Await session ONCE, store resolved reference for zero-latency sends
            this.session = await sessionPromise;

        } catch (error) {
            console.error("Failed to connect to Live API", error);
            this.config.onError?.(error);
            this.cleanup();
        }
    }

    /**
     * Send a video/screen frame to the live session.
     * Used for camera and screen sharing features.
     */
    sendVideoFrame(base64Data: string) {
        if (this.session && this.active) {
            this.session.sendRealtimeInput({
                video: { data: base64Data, mimeType: 'image/jpeg' }
            });
        }
    }

    disconnect() {
        // Gracefully close the session
        this.session?.close();
        this.cleanup();
    }

    private cleanup() {
        this.active = false;
        this.recorder?.stop();
        this.recorder = null;
        this.player?.destroy();
        this.player = null;
        this.session = null;
    }
}

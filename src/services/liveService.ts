import { GoogleGenerativeAI } from "@google/generative-ai";

// Add this to handle the missing types without a separate file if I want to be quick, 
// but since I created the d.ts file, I should just ensure it's picked up. 
// However, to be safe and immediate:
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}


interface LiveClientOptions {
    apiKey: string;
    systemInstruction?: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onVolumeChange?: (volume: number) => void;
    onError?: (error: any) => void;
}

export class GeminiLiveClient {
    private genAI: GoogleGenerativeAI;
    private options: LiveClientOptions;
    private recognition: any = null;
    private synthesis: SpeechSynthesis = window.speechSynthesis;
    private isConnected: boolean = false;
    private model: any;
    private chat: any;

    constructor(options: LiveClientOptions) {
        this.options = options;
        this.genAI = new GoogleGenerativeAI(options.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    async connect() {
        try {
            this.isConnected = true;
            this.chat = this.model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: this.options.systemInstruction || "You are a helpful assistant." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I am ready to help." }],
                    },
                ],
            });

            this.setupSpeechRecognition();
            this.options.onConnect?.();
        } catch (error) {
            this.options.onError?.(error);
        }
    }

    disconnect() {
        this.isConnected = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        this.synthesis.cancel();
        this.options.onDisconnect?.();
    }

    private setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.options.onError?.("Speech recognition not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Keep listening
        this.recognition.interimResults = false;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => {
            console.log("Speech recognition started");
        };

        this.recognition.onresult = async (event: any) => {
            if (!this.isConnected) return;

            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript;

            if (event.results[lastResultIndex].isFinal) {
                console.log("User said:", transcript);
                // Simulate volume change for visual feedback
                this.simulateVolume();
                await this.processUserInput(transcript);
            }
        };

        this.recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                this.options.onError?.("Microphone access denied.");
                this.disconnect();
            }
        };

        this.recognition.onend = () => {
            // Restart if still connected (continuous listening workaround)
            if (this.isConnected) {
                try {
                    this.recognition?.start();
                } catch (e) {
                    // Ignore if already started
                }
            }
        };

        this.recognition.start();
    }

    private async processUserInput(text: string) {
        try {
            const result = await this.chat.sendMessage(text);
            const response = await result.response;
            const responseText = response.text();
            console.log("Gemini said:", responseText);
            this.speak(responseText);
        } catch (error) {
            console.error("Error getting response from Gemini:", error);
            this.speak("I'm sorry, I'm having trouble connecting right now.");
        }
    }

    private speak(text: string) {
        if (!this.isConnected) return;

        // Stop listening while speaking to avoid hearing itself (optional, but good for simple setups)
        // this.recognition?.stop(); 

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => {
            // Simulate speaking volume
            this.simulateSpeakingVolume();
        };
        utterance.onend = () => {
            // Resume listening if we stopped it
            // if (this.isConnected) this.recognition?.start();
            this.options.onVolumeChange?.(0);
        };
        this.synthesis.speak(utterance);
    }

    private simulateVolume() {
        // Quick blip for user input
        let vol = 0;
        const interval = setInterval(() => {
            vol = Math.random();
            this.options.onVolumeChange?.(vol);
            if (!this.isConnected) clearInterval(interval);
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            this.options.onVolumeChange?.(0);
        }, 1000);
    }

    private simulateSpeakingVolume() {
        const interval = setInterval(() => {
            if (this.synthesis.speaking && this.isConnected) {
                this.options.onVolumeChange?.(Math.random() * 0.8 + 0.2);
            } else {
                clearInterval(interval);
                this.options.onVolumeChange?.(0);
            }
        }, 100);
    }
}

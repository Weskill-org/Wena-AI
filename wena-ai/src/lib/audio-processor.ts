
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (base64Data: string) => void) {}

  async start() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // ScriptProcessor is deprecated but often easier for raw PCM in simple cases
    // AudioWorklet is better but requires a separate file. 
    // For this applet, we'll use ScriptProcessor for simplicity if possible, 
    // or I can try to write a small Worklet string.
    
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

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000; // Gemini Live output is usually 24kHz

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
}

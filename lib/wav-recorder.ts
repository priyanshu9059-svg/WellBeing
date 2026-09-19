/** Encode Float32 mono samples as 16-bit PCM WAV at given sample rate. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export type WavRecorder = {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  discard: () => void;
};

/** Record mic audio as 16 kHz mono 16-bit PCM WAV (CareSignal-compatible). */
export function createWavRecorder(): WavRecorder {
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  const chunks: Float32Array[] = [];
  const targetRate = 16000;

  return {
    async start() {
      chunks.length = 0;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(context.destination);
    },
    async stop() {
      const rate = context?.sampleRate ?? 48000;
      processor?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      await context?.close();
      processor = null;
      source = null;
      stream = null;
      context = null;
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      // Resample to 16 kHz if needed
      if (rate === targetRate) return encodeWav(merged, targetRate);
      const ratio = rate / targetRate;
      const outLen = Math.floor(merged.length / ratio);
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        out[i] = merged[Math.floor(i * ratio)] ?? 0;
      }
      return encodeWav(out, targetRate);
    },
    discard() {
      processor?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      void context?.close();
      processor = null;
      source = null;
      stream = null;
      context = null;
      chunks.length = 0;
    },
  };
}

/**
 * Browser speech recognition for live mic transcription (no API key required).
 * Works in Chromium-based browsers; returns null when unsupported.
 */

export type BrowserSpeechSession = {
  getText: () => string;
  stop: () => Promise<string>;
  getError: () => string | null;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function SpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isBrowserSpeechSupported() {
  return Boolean(SpeechRecognitionCtor());
}

export function startBrowserSpeech(
  lang = 'en-IN',
  onUpdate?: (text: string) => void,
): BrowserSpeechSession | null {
  const Ctor = SpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let finalized = '';
  let latest = '';
  let active = true;
  let lastError: string | null = null;
  let stopping = false;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) finalized += `${piece} `;
      else interim += piece;
    }
    latest = `${finalized}${interim}`.replace(/\s+/g, ' ').trim();
    onUpdate?.(latest);
  };

  recognition.onerror = (event) => {
    const code = event.error || 'unknown';
    // These are normal while stopping / during brief silence.
    if (code === 'aborted' || code === 'no-speech') return;
    lastError = code;
  };

  recognition.onend = () => {
    if (!active || stopping) return;
    // Chrome often ends recognition after a pause; keep listening while recording.
    try {
      recognition.start();
    } catch {
      /* already started or unsupported mid-session */
    }
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    getText: () => latest || finalized.trim(),
    getError: () => lastError,
    stop: () =>
      new Promise((resolve) => {
        active = false;
        stopping = true;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve((latest || finalized).trim());
        };
        recognition.onend = finish;
        try {
          recognition.stop();
        } catch {
          finish();
        }
        setTimeout(finish, 1200);
      }),
  };
}

export function pickBestTranscript(...candidates: Array<string | null | undefined>) {
  const cleaned = candidates
    .map((t) => (t || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((t) => !/^I have been feeling overwhelmed lately/i.test(t));
  if (!cleaned.length) return '';
  return cleaned.sort((a, b) => b.length - a.length)[0];
}

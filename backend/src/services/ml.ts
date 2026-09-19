/**
 * Client for CareSignal ML sidecar (WellBeing ml-service on :8010).
 */

export type MlPack = {
  distress?: number;
  safety_risk?: number;
  escalation_risk?: number;
  priority?: string;
  sentiment_label?: string;
  sentiment_score?: number;
  stress_score?: number | null;
  emotion_label?: string | null;
  emotions?: Record<string, number>;
  signals?: Record<string, boolean>;
  factors?: string[];
  recommendations?: string[];
  method?: string;
  fallback?: boolean;
  voice?: Record<string, unknown> | null;
  explanation?: unknown[];
  limitations?: string;
  raw?: Record<string, unknown>;
};

function mlBase() {
  return (process.env.ML_BASE_URL || 'http://127.0.0.1:8010').replace(/\/$/, '');
}

async function mlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const timeoutMs = Number(process.env.ML_TIMEOUT_MS || 45000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${mlBase()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ML ${res.status}: ${detail || res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function mlHealth(): Promise<boolean> {
  try {
    const data = await mlFetch<{ status?: string }>('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function mlAnalyzeText(input: {
  text: string;
  language?: string;
  theme?: string;
}): Promise<MlPack> {
  return mlFetch<MlPack>('/analyze/text', {
    method: 'POST',
    body: JSON.stringify({
      text: input.text,
      language: input.language || 'en',
      theme: input.theme,
    }),
  });
}

export async function mlAnalyzeVoice(input: {
  wav: Buffer;
  filename?: string;
  transcript?: string;
  text?: string;
  language?: string;
  theme?: string;
}): Promise<MlPack> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(input.wav)], { type: 'audio/wav' }),
    input.filename || 'checkin.wav',
  );
  if (input.transcript) form.append('transcript', input.transcript);
  if (input.text) form.append('text', input.text);
  if (input.language) form.append('language', input.language);
  if (input.theme) form.append('theme', input.theme);
  return mlFetch<MlPack>('/analyze/voice', { method: 'POST', body: form });
}

export const CHECKIN_THEMES = [
  { id: 'threats_intimidation', label: 'Threats / intimidation' },
  { id: 'court_legal_stress', label: 'Court / legal stress' },
  { id: 'investigation_delays', label: 'Investigation or trial delays' },
  { id: 'social_ostracism', label: 'Social ostracism / isolation' },
  { id: 'economic_hardship', label: 'Economic hardship' },
  { id: 'rehabilitation_housing', label: 'Rehabilitation / housing' },
  { id: 'sleep_daily', label: 'Sleep / daily functioning' },
  { id: 'family_safety', label: 'Family safety' },
  { id: 'counselling_support', label: 'Counselling / psychological support' },
  { id: 'general_wellbeing', label: 'General wellbeing' },
] as const;

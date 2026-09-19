/**
 * Client for the Aria personalized chatbot (FastAPI / OpenRouter).
 * Express owns auth + persistence; Aria owns empathetic replies + risk/emotion.
 */

export type AriaRiskLevel = 'low' | 'moderate' | 'high' | 'crisis';
export type AriaEmotion =
  | 'happy'
  | 'calm'
  | 'anxious'
  | 'stressed'
  | 'sad'
  | 'distressed'
  | 'angry'
  | 'hopeless'
  | 'neutral';

export type AriaMessageResult = {
  reply: string;
  followUp: boolean;
  emotion: AriaEmotion;
  riskLevel: AriaRiskLevel;
  confidence: number;
  conversationTurn: number;
};

const DEFAULT_BASE = 'http://127.0.0.1:8000';

function ariaBase() {
  return (process.env.ARIA_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

function ariaEnabled() {
  return process.env.ARIA_ENABLED !== '0' && process.env.ARIA_ENABLED !== 'false';
}

async function ariaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const timeoutMs = Number(process.env.ARIA_TIMEOUT_MS || 35000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ariaBase()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Aria ${res.status}: ${detail || res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function ariaHealth(): Promise<boolean> {
  if (!ariaEnabled()) return false;
  try {
    const data = await ariaFetch<{ status?: string }>('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function startAriaSession(): Promise<{ sessionId: string; message: string }> {
  const data = await ariaFetch<{ session_id: string; message: string }>('/chat/start', {
    method: 'POST',
  });
  return { sessionId: data.session_id, message: data.message };
}

export async function sendAriaMessage(sessionId: string, message: string): Promise<AriaMessageResult> {
  const data = await ariaFetch<{
    reply: string;
    follow_up: boolean;
    emotion: AriaEmotion;
    risk_level: AriaRiskLevel;
    confidence: number;
    conversation_turn: number;
  }>('/chat/message', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  return {
    reply: data.reply,
    followUp: data.follow_up,
    emotion: data.emotion,
    riskLevel: data.risk_level,
    confidence: data.confidence,
    conversationTurn: data.conversation_turn,
  };
}

export async function deleteAriaSession(sessionId: string): Promise<void> {
  try {
    await ariaFetch(`/chat/${sessionId}`, { method: 'DELETE' });
  } catch {
    /* best-effort */
  }
}

export function riskToUrgency(risk: AriaRiskLevel): 'none' | 'support' | 'urgent' {
  if (risk === 'crisis') return 'urgent';
  if (risk === 'high' || risk === 'moderate') return 'support';
  return 'none';
}

export function riskToDashboardLevel(risk: AriaRiskLevel): 'Low' | 'Moderate' | 'Elevated' | 'High' {
  if (risk === 'crisis' || risk === 'high') return 'High';
  if (risk === 'moderate') return 'Elevated';
  return 'Low';
}

export function riskToScore(risk: AriaRiskLevel, confidence: number): number {
  const base =
    risk === 'crisis' ? 92 : risk === 'high' ? 78 : risk === 'moderate' ? 55 : 28;
  return Math.round(Math.min(99, Math.max(10, base + (confidence - 0.5) * 20)));
}

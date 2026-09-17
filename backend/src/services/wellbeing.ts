const HIGH_RISK = ['suicide', 'want to die', 'hurt myself', 'kill myself', 'end my life'];

export function screenRisk(text: string): { flagged: boolean; matched: string[] } {
  const lower = text.toLowerCase();
  const matched = HIGH_RISK.filter((p) => lower.includes(p));
  return { flagged: matched.length > 0, matched };
}

export function supportiveReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('exam')) {
    return 'It sounds like the pressure around your exams is taking up a lot of space. What feels most difficult about it right now?';
  }
  if (lower.includes('sleep')) {
    return 'Not being able to rest can make everything feel heavier. Would you like to tell me what usually happens when you try to sleep?';
  }
  if (lower.includes('alone') || lower.includes('lonely')) {
    return 'Feeling alone with something difficult can hurt. I’m here to listen—what has today been like for you?';
  }
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('worried')) {
    return 'Anxiety can make the body and mind feel restless together. What tends to show up first for you—thoughts, body sensations, or both?';
  }
  if (lower.includes('family')) {
    return 'Family dynamics can be complicated and emotionally draining. What part of that relationship feels hardest to hold right now?';
  }
  return 'I’m hearing that this is a lot to hold right now. What part would feel most helpful to talk through first?';
}

export async function generateChatReply(message: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return supportiveReply(message);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You are a calm, non-clinical mental wellbeing support companion for India. Listen empathetically. Do not diagnose, prescribe, or claim to be a therapist. Encourage professional help and crisis resources (Tele-MANAS 14416, emergency 112) when risk is present. Keep replies short (2–4 sentences).',
          },
          { role: 'user', content: message },
        ],
      }),
    });
    if (!res.ok) return supportiveReply(message);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || supportiveReply(message);
  } catch {
    return supportiveReply(message);
  }
}

export type Level = 'Low' | 'Moderate' | 'Elevated' | 'High';

function levelFromIndex(i: number): Level {
  return (['Low', 'Moderate', 'Elevated', 'High'] as Level[])[Math.max(0, Math.min(3, i))];
}

export function analyzeWellbeing(answers: string[]): {
  distress: Level;
  safetyConcern: Level;
  stress: Level;
  socialIsolation: Level;
  sleepDisruption: Level;
  escalation: Level;
  confidence: number;
  factors: string[];
} {
  const distressIdx = Math.max(
    0,
    ['Low', 'Moderate', 'Elevated', 'High'].indexOf(answers[0] ?? 'Moderate'),
  );
  const supportIdx = Math.max(
    0,
    ['Well supported', 'Some support', 'Very little support', 'Unsure'].indexOf(answers[1] ?? 'Some support'),
  );
  const sleepIdx = Math.max(
    0,
    ['Not affected', 'A little', 'Quite a lot', 'Severely'].indexOf(answers[2] ?? 'A little'),
  );

  const isolationIdx = supportIdx;
  const stressIdx = Math.round((distressIdx + sleepIdx) / 2);
  const escalationIdx = Math.min(3, Math.round((distressIdx + isolationIdx + sleepIdx) / 3));
  const factors: string[] = [];
  if (distressIdx >= 2) factors.push('Recent emotional pressure');
  if (sleepIdx >= 2) factors.push('Interrupted sleep');
  if (supportIdx >= 2) factors.push('Limited social support');
  if (!factors.length) factors.push('Ongoing life demands');

  return {
    distress: levelFromIndex(distressIdx),
    safetyConcern: levelFromIndex(Math.max(0, distressIdx - 1)),
    stress: levelFromIndex(stressIdx),
    socialIsolation: levelFromIndex(isolationIdx),
    sleepDisruption: levelFromIndex(sleepIdx),
    escalation: levelFromIndex(escalationIdx),
    confidence: 62 + Math.round(((distressIdx + sleepIdx + supportIdx) / 9) * 28),
    factors,
  };
}

export function analyzeVoiceHeuristic(_sizeBytes: number): Record<string, string> {
  void _sizeBytes;
  return {
    pace: 'Steady',
    pauses: 'Some',
    energy: 'Moderate',
    voiceActivity: 'Present',
    possibleTone: 'Reflective',
  };
}

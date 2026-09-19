type Language = 'English' | 'Hindi' | 'Hinglish';
type ChatChoice = { label: string; value: string };
type ChatAction = { label: string; href: string; tone?: 'primary' | 'danger' | 'secondary' };
type ChatUrgency = 'none' | 'support' | 'urgent';

const HIGH_RISK = ['suicide', 'want to die', 'hurt myself', 'kill myself', 'end my life', 'take my life'];
const PHYSICAL_URGENT = [
  'call the police', 'call police', 'police', 'emergency', 'someone is attacking', 'being attacked', 'assault',
  'domestic violence', 'in danger', 'not physically safe', 'can\'t breathe', 'cannot breathe', 'severe bleeding',
  'bleeding badly', 'overdose', 'fire',
];

export type RiskScreen = { flagged: boolean; physicalUrgent: boolean; matched: string[] };

export function screenRisk(text: string): RiskScreen {
  const lower = text.toLowerCase();
  const matched = HIGH_RISK.filter((p) => lower.includes(p));
  return { flagged: matched.length > 0, physicalUrgent: PHYSICAL_URGENT.some((p) => lower.includes(p)), matched };
}

export type ChatReply = {
  text: string;
  choices: ChatChoice[];
  actions: ChatAction[];
  urgency: ChatUrgency;
  emotion?: string;
  riskLevel?: string;
  confidence?: number;
  source?: 'aria' | 'openai' | 'fallback';
};

const supportChoices: ChatChoice[] = [
  { label: 'Help me understand what I’m feeling', value: 'I want help understanding what I am feeling.' },
  { label: 'Give me one small thing to try', value: 'Please give me one small thing I can try right now.' },
  { label: 'I just need you to listen', value: 'I do not need advice yet; please listen.' },
];

const languageInstruction: Record<Language, string> = {
  English: 'Reply in clear English.',
  Hindi: 'Reply in Hindi using Devanagari where natural. Keep medical/safety terms simple.',
  Hinglish: 'Reply in natural Hinglish, mixing simple Hindi and English without making it formal.',
};

const firstStepChoices: ChatChoice[] = [
  { label: 'Emotional support', value: 'I need emotional or mental support.' },
  { label: 'Physical safety / police', value: 'I need help with physical safety or police.' },
  { label: 'Find nearby care', value: 'Help me find a psychologist, psychiatrist, hospital, or police station nearby.' },
];

const careActions: ChatAction[] = [
  { label: 'Find nearby care', href: '/consultancy', tone: 'primary' },
  { label: 'Open crisis resources', href: '/crisis', tone: 'secondary' },
];

function inferLanguage(message: string, selected: Language): Language {
  if (/[\u0900-\u097F]/.test(message)) return 'Hindi';
  if (/\b(mai|main|mujhe|mera|meri|kaise|kya|nahi|haan|thoda|bahut|darr|ghabra|tension|madad|samajh|sun|karna|chahiye|hoon|hai)\b/i.test(message)) {
    return 'Hinglish';
  }
  return selected;
}

function choicesFor(message: string): ChatChoice[] {
  const lower = message.toLowerCase();
  if (/(physical safety|police|danger|attack|assault|violence|unsafe|medical|hospital|doctor|clinic|ngo|care nearby|nearby care|help nearby)/.test(lower)) {
    return [
      { label: 'Find professional care', value: 'Show me nearby mental health clinics and hospitals.' },
      { label: 'I may be unsafe now', value: 'I may be physically unsafe right now and need urgent help.' },
      { label: 'I need police support', value: 'I need police support near me.' },
    ];
  }
  if (/(sleep|insomnia|awake|नींद|सो नहीं)/.test(lower)) {
    return [
      { label: 'Racing thoughts', value: 'My thoughts keep racing when I try to sleep.' },
      { label: 'My body feels restless', value: 'My body feels restless or tense at night.' },
      { label: 'I wake up during the night', value: 'I wake up during the night and struggle to return to sleep.' },
    ];
  }
  if (/(anxious|anxiety|panic|worried|घबर|चिंता)/.test(lower)) {
    return [
      { label: 'Mostly thoughts', value: 'The worry is mostly in my thoughts.' },
      { label: 'Mostly body sensations', value: 'The worry is mostly showing up in my body.' },
      { label: 'Both', value: 'The thoughts and body sensations are happening together.' },
    ];
  }
  if (/(exam|work|study|pressure|stress|परीक्षा|काम)/.test(lower)) {
    return [
      { label: 'I need a plan', value: 'I need help making a small plan for this pressure.' },
      { label: 'I feel stuck', value: 'I feel stuck and cannot figure out where to start.' },
      { label: 'I need a break', value: 'I need help taking a short break without feeling guilty.' },
    ];
  }
  return supportChoices;
}

function stepChoices(message: string): ChatChoice[] {
  const lower = message.toLowerCase();
  if (/(plan|stuck|start|pressure|exam|work|study|break|guilty)/.test(lower)) {
    return [
      { label: 'Make a 10 minute plan', value: 'Help me make a 10 minute plan.' },
      { label: 'Calm my body first', value: 'Help me calm my body first.' },
      { label: 'Choose one priority', value: 'Help me choose only one priority.' },
    ];
  }
  if (/(feeling|emotion|understand|listen|heavy)/.test(lower)) {
    return [
      { label: 'Name the feeling', value: 'Help me name this feeling.' },
      { label: 'What triggered it?', value: 'Help me understand what triggered this feeling.' },
      { label: 'Just listen', value: 'Please just listen and reflect what I am saying.' },
    ];
  }
  return choicesFor(message);
}

function urgentReply(): ChatReply {
  return {
    text: 'Your immediate physical safety matters more than continuing this chat. Move to a safer public place if you can, contact someone you trust, and call emergency services now if there is immediate danger.',
    choices: [],
    urgency: 'urgent',
    actions: [
      { label: 'Call emergency services (112)', href: 'tel:112', tone: 'danger' },
      { label: 'Open safety resources', href: '/crisis', tone: 'secondary' },
    ],
  };
}

export function supportiveReply(message: string): string {
  const lower = message.toLowerCase();
  if (/^(hi|hello|hey|namaste|नमस्ते)\b/.test(lower)) {
    return 'Hi, I’m here. You can ask me anything, or we can start with what kind of help would feel useful right now.';
  }
  if (/(what can you do|who are you|help me|start|begin)/.test(lower)) {
    return 'I can answer general questions, listen to what you are going through, help you sort feelings, suggest small coping steps, and point you toward urgent or nearby support when safety or health is involved.';
  }
  if (/(capital of india|india capital)/.test(lower)) {
    return 'The capital of India is New Delhi.';
  }
  if (/(javascript|typescript|react|next\.?js|coding|code)/.test(lower)) {
    return 'I can help with general coding questions too. Share the specific thing you are trying to build or debug, and I’ll answer directly.';
  }
  if (/(nearby|clinic|hospital|psychiatrist|psychologist|therapy|therapist|ngo|centre|center)/.test(lower)) {
    return 'I can help you look for nearby support. Use the Find care page to search by city or current location, then filter results into mental health clinics, hospitals, or police stations.';
  }
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

function localizedFallback(message: string, selectedLanguage: Language, history: Array<{ role: 'user' | 'assistant'; text: string }> = []): ChatReply {
  const language = inferLanguage(message, selectedLanguage);
  const lower = message.toLowerCase();
  const isCare = /(nearby|clinic|hospital|psychiatrist|psychologist|therapy|therapist|ngo|centre|center|care)/.test(lower);
  const isOpening = /^(hi|hello|hey|namaste|नमस्ते)\b|what can you do|start|begin/.test(lower);
  const wantsPlan = /(plan|small plan|10 minute|priority|pressure)/.test(lower);
  const feelsStuck = /(stuck|cannot figure|where to start|शुरू|atak|अटक)/.test(lower);
  const wantsBreak = /(break|guilty|pause|rest|आराम|विराम)/.test(lower);
  const wantsListening = /(listen|just listen|sun|सुन)/.test(lower);
  const wantsFeelingHelp = /(feeling|emotion|understand what i am feeling|name this feeling|triggered)/.test(lower);
  const previousUser = history.filter((item) => item.role === 'user').slice(-3).map((item) => item.text).join(' ');
  const context = `${previousUser} ${message}`.toLowerCase();
  const isPressureContext = /(exam|work|study|pressure|stress|deadline|परीक्षा|काम|tension)/.test(context);
  let text = supportiveReply(message);
  if (language === 'Hindi') {
    if (isOpening) text = 'मैं यहां हूं। आप कोई भी सवाल पूछ सकते हैं, या हम यह चुनकर शुरू कर सकते हैं कि अभी किस तरह की मदद चाहिए।';
    else if (isCare) text = 'पास की सहायता खोजने के लिए Find care खोलें। वहां शहर या current location से mental health clinics, hospitals और police stations देख सकते हैं।';
    else if (wantsPlan || (isPressureContext && !wantsBreak)) text = 'ठीक है, इसे छोटा रखते हैं: पहले 2 मिनट में सिर्फ काम लिखें, फिर 10 मिनट के लिए सबसे आसान काम शुरू करें, और उसके बाद रुककर देखें कि आगे क्या करना है। अभी सबसे छोटा पहला काम कौन सा है?';
    else if (feelsStuck) text = 'जब सब कुछ एक साथ दिखता है तो शुरुआत मुश्किल लगती है। अभी सिर्फ एक काम चुनें जो 5-10 मिनट में शुरू हो सके, पूरा होना जरूरी नहीं।';
    else if (wantsBreak) text = 'Break लेना avoid करना नहीं है, nervous system को reset करना है। 3 मिनट पानी, धीमी सांस, और screen से नजर हटाकर वापस आएं।';
    else if (wantsListening) text = 'मैं सुन रहा हूं। अभी सलाह की जल्दी नहीं करते—जो सबसे भारी हिस्सा है, उसे अपने शब्दों में लिख दें।';
    else if (wantsFeelingHelp) text = 'चलो feeling को थोड़ा साफ करते हैं। क्या यह ज्यादा डर, उदासी, गुस्सा, शर्म, या थकान जैसा लग रहा है?';
    else text = 'मैं समझ रहा हूं कि अभी यह भारी हो सकता है। किस हिस्से पर पहले बात करना सबसे helpful लगेगा?';
  } else if (language === 'Hinglish') {
    if (isOpening) text = 'Main yahan hoon. Aap koi bhi question pooch sakte ho, ya hum choose kar sakte hain ki abhi kis type ki help chahiye.';
    else if (isCare) text = 'Nearby support ke liye Find care open karo. Wahan city ya current location se mental health clinics, hospitals aur police stations milenge.';
    else if (wantsPlan || (isPressureContext && !wantsBreak)) text = 'Theek hai, chhota plan banate hain: 2 minutes mein tasks likho, phir 10 minutes ke liye sabse easy task start karo, phir pause karke next decide karo. Abhi sabse chhota first step kya ho sakta hai?';
    else if (feelsStuck) text = 'Jab sab kuch ek saath dikhta hai, start karna hard lagta hai. Abhi sirf ek 5-10 minute wala step choose karo; complete karna zaroori nahi.';
    else if (wantsBreak) text = 'Break lena avoid karna nahi hai; body ko reset dena hai. 3 minutes water, slow breathing, aur screen se nazar hatao, phir wapas aao.';
    else if (wantsListening) text = 'Main sun raha hoon. Advice ki jaldi nahi karte—jo sabse heavy part hai, apne words mein likho.';
    else if (wantsFeelingHelp) text = 'Chalo feeling ko name karte hain. Ye zyada fear, sadness, anger, shame, ya tiredness jaisa lag raha hai?';
    else text = 'Mujhe lag raha hai ye abhi heavy ho sakta hai. Kis part ko pehle talk through karna helpful lagega?';
  } else if (wantsPlan || (isPressureContext && !wantsBreak)) {
    text = 'Let’s make this practical. Write every task down for two minutes, pick the easiest useful one, work on it for ten minutes, then pause and choose the next step. What is the smallest task you can start right now?';
  } else if (feelsStuck) {
    text = 'Feeling stuck usually means the problem is too large to hold at once. Let’s shrink it: choose one action that takes 5-10 minutes and does not need to be perfect.';
  } else if (wantsBreak) {
    text = 'A short break is not failure; it is a reset. Try three minutes away from the screen, sip water, relax your jaw and shoulders, then return to one small next step.';
  } else if (wantsListening) {
    text = 'I’m listening. No advice first: tell me the part that feels heaviest, and I’ll reflect it back clearly.';
  } else if (wantsFeelingHelp) {
    text = 'Let’s name it gently. Does this feel closer to fear, sadness, anger, shame, exhaustion, or a mix of several?';
  }
  return {
    text,
    choices: isCare ? [
      { label: 'Find nearby care', value: 'Help me find nearby care.' },
      { label: 'Mental support', value: 'I need mental health support.' },
      { label: 'Urgent physical help', value: 'I need urgent physical safety help.' },
    ] : isOpening ? firstStepChoices : stepChoices(message),
    actions: isCare ? careActions : [],
    urgency: isCare || !isOpening ? 'support' : 'none',
  };
}

export async function generateChatReply(message: string, history: Array<{ role: 'user' | 'assistant'; text: string }> = [], language: Language = 'English'): Promise<ChatReply> {
  const risk = screenRisk(message);
  if (risk.physicalUrgent) return urgentReply();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const resolvedLanguage = inferLanguage(message, language);
  if (!apiKey) return localizedFallback(message, resolvedLanguage, history);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 420,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `You are Wellbeing Support, a careful conversational assistant for general questions and mental wellbeing support in India. ${languageInstruction[resolvedLanguage]} Understand Hindi, English, and Hinglish, including romanized Hindi. Answer the user's actual question; do not force a mental-health interpretation onto ordinary questions. For emotional topics, be warm and practical without diagnosing, prescribing, or claiming to be a therapist. Use the user's answers to navigate the next helpful step: emotional support, physical/medical help, police/safety support, or nearby care. Do not repeat the same generic response after the user chooses an option; advance the conversation with a concrete next step. Ask at most one useful follow-up question when context is missing. Return ONLY valid JSON with {"text": string, "choices": [{"label": string, "value": string}], "actions": [{"label": string, "href": string, "tone": "primary"|"secondary"|"danger"}], "urgency": "none"|"support"|"urgent"}. Use 0-3 choices only when they genuinely help the next answer. Add /consultancy as an action when the user needs nearby clinics, hospitals, psychiatrists, psychologists, police, NGOs, or care centers. Never invent phone numbers. For immediate physical danger use urgency "urgent", suggest 112, and use href "tel:112". For self-harm risk, state that immediate help is important and mention Tele-MANAS 14416 and emergency 112. Keep text to 2-5 short sentences.`,
          },
          ...history.slice(-12).map((item) => ({ role: item.role, content: item.text })),
          { role: 'user', content: message },
        ],
      }),
    });
    if (!res.ok) return localizedFallback(message, resolvedLanguage, history);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') as Partial<ChatReply>;
    return {
      text: typeof parsed.text === 'string' && parsed.text.trim() ? parsed.text.trim() : localizedFallback(message, resolvedLanguage, history).text,
      choices: Array.isArray(parsed.choices) ? parsed.choices.filter((choice): choice is ChatChoice => Boolean(choice?.label && choice?.value)).slice(0, 3) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions.filter((action): action is ChatAction => Boolean(action?.label && action?.href)).slice(0, 3) : [],
      urgency: parsed.urgency === 'urgent' || parsed.urgency === 'support' ? parsed.urgency : 'none',
    };
  } catch {
    return localizedFallback(message, resolvedLanguage, history);
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

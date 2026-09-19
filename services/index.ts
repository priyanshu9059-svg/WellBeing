import type {
  ChatMessage,
  ContactConsent,
  JournalEntry,
  Language,
  MoodEntry,
  SafetyPlan,
  WellbeingSnapshot,
} from '@/types';
import { apiAuthed, apiFetch, ensureSession, getToken, isApiEnabled, setToken } from '@/lib/api';

export type ServiceResult<T> = { data: T | null; loading: boolean; error: string | null };

export interface ChatService {
  send(message: string, signal?: AbortSignal, language?: Language): Promise<ChatMessage>;
  load?(signal?: AbortSignal): Promise<ChatMessage[]>;
  clear?(signal?: AbortSignal): Promise<ChatMessage[]>;
  feedback?(messageId: string, value: 'helpful' | 'not-helpful', signal?: AbortSignal): Promise<void>;
}

export interface VoiceTranscriptionService {
  transcribe(blob: Blob, signal?: AbortSignal): Promise<string>;
}
export interface VoiceAnalysisService {
  analyze(blob: Blob, signal?: AbortSignal): Promise<Record<string, string>>;
}
export interface ConversationRecordingService {
  upload(blob: Blob, signal?: AbortSignal): Promise<{ id: string; filename: string; sizeBytes: number }>;
  list(signal?: AbortSignal): Promise<ConversationRecording[]>;
  get(id: string, signal?: AbortSignal): Promise<Blob>;
  remove(id: string, signal?: AbortSignal): Promise<void>;
}
export type ConversationRecording = { id: string; filename: string; sizeBytes: number; mimeType?: string; createdAt?: string };
export interface RiskScreeningService {
  screen(text: string, signal?: AbortSignal): Promise<{ flagged: boolean }>;
}
export interface WellbeingAnalysisService {
  analyze(input: Record<string, unknown>, signal?: AbortSignal): Promise<WellbeingSnapshot>;
}
export interface AuthenticationService {
  signIn(email: string, password: string, signal?: AbortSignal): Promise<{ token: string; user: AuthUser; needsProfile?: boolean }>;
  signUp(input: ProfessionalSignup, signal?: AbortSignal): Promise<{ token: string; user: AuthUser; needsProfile?: boolean }>;
  me(signal?: AbortSignal): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
export interface UserProfileService {
  update(input: ContactConsent, signal?: AbortSignal): Promise<ContactConsent>;
  getConsent?(signal?: AbortSignal): Promise<ContactConsent>;
  getDetails?(signal?: AbortSignal): Promise<UserProfileDetails>;
  saveDetails?(input: Partial<UserProfileDetails> & { skipped?: boolean }, signal?: AbortSignal): Promise<UserProfileDetails>;
}
export interface JournalService {
  list(signal?: AbortSignal): Promise<JournalEntry[]>;
  create?(entry: Omit<JournalEntry, 'id' | 'date'> & { date?: string }, signal?: AbortSignal): Promise<JournalEntry>;
  update?(id: string, entry: Partial<JournalEntry>, signal?: AbortSignal): Promise<JournalEntry>;
  remove?(id: string, signal?: AbortSignal): Promise<void>;
}
export interface MoodService {
  list(signal?: AbortSignal): Promise<MoodEntry[]>;
  create?(entry: Omit<MoodEntry, 'id'> & { id?: string }, signal?: AbortSignal): Promise<MoodEntry>;
}
export interface SafetyPlanService {
  save(plan: SafetyPlan, signal?: AbortSignal): Promise<SafetyPlan>;
  get?(signal?: AbortSignal): Promise<SafetyPlan>;
}
export interface NotificationService {
  send(input: { channel: 'sms' | 'email'; to: string; subject?: string; body: string }, signal?: AbortSignal): Promise<{ id: string; status: string; message: string }>;
}
export interface CounsellorService {
  request(input?: { note?: string; allowSummary?: boolean }, signal?: AbortSignal): Promise<{ id: string; status: string; message: string }>;
}
export interface EmergencyService {
  connect(signal?: AbortSignal): Promise<{ dispatched: boolean; message: string; resources: Record<string, string> }>;
}
export interface OrganizationService {
  validateCode(code: string, ageBand: string, signal?: AbortSignal): Promise<{ valid: boolean; organization?: { name: string; code: string } }>;
  aggregates?(code: string, signal?: AbortSignal): Promise<unknown>;
}
export interface AnalyticsService {
  track(event: string, meta?: Record<string, unknown>, signal?: AbortSignal): Promise<void>;
}
export interface CareService {
  listPlaces(signal?: AbortSignal): Promise<CarePlaceDto[]>;
  listAppointments(signal?: AbortSignal): Promise<AppointmentDto[]>;
  bookAppointment(input: BookAppointmentInput, signal?: AbortSignal): Promise<AppointmentDto>;
  updateAppointment(id: string, status: AppointmentDto['status'], signal?: AbortSignal): Promise<{ id: string; status: string }>;
}
export interface ProfessionalService {
  dashboard(signal?: AbortSignal): Promise<ProfessionalDashboard>;
  replyQuery(id: string, reply: string, signal?: AbortSignal): Promise<void>;
  resolveQuery(id: string, signal?: AbortSignal): Promise<void>;
  setAvailability(input: { available?: boolean; acceptPriority?: boolean }, signal?: AbortSignal): Promise<void>;
  notifications?(signal?: AbortSignal): Promise<EmailNotificationLog[]>;
}

export type EmailNotificationLog = {
  id: string;
  to: string;
  notificationType: string;
  subject: string | null;
  body: string | null;
  status: string;
  providerMessageId: string | null;
  createdAt: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  anonymous: boolean;
  language: string;
};

export type ProfessionalSignup = {
  email: string;
  password: string;
  displayName: string;
  role: 'USER' | 'COUNSELLOR' | 'PSYCHOLOGIST' | 'PSYCHIATRIST';
  licenceNumber?: string;
};

export type UserProfileDetails = {
  location: string;
  abhaId: string;
  phone: string;
  gender: string;
  age: number | null;
  skipped?: boolean;
  updatedAt?: string | null;
};

export type PatientProfile = {
  location: string;
  abhaId: string;
  phone: string;
  gender: string;
  age: number | null;
  email?: string;
  skipped?: boolean;
  updatedAt?: string | null;
};

export type CarePlaceDto = {
  id: string;
  name: string;
  type: string;
  area: string;
  distance: string;
  distanceKm: number;
  rating: string;
  reviews: number;
  phone: string;
  hours: string;
  next: string;
  x: number;
  y: number;
  specialties: string[];
};

export type AppointmentDto = {
  id: string;
  place: string;
  clinician: string;
  date: string;
  time: string;
  mode: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Requested';
};

export type BookAppointmentInput = {
  placeId?: string;
  placeName: string;
  clinician?: string;
  date: string;
  time: string;
  mode: string;
};

export type ProfessionalDashboard = {
  professional: { id: string; displayName: string | null; role: string };
  metrics: { queue: number; callsToday: number; openQueries: number; responseMinutes: number };
  patients: Array<{
    id: string;
    name: string;
    score: number;
    level: string;
    signal: string;
    last: string;
    consent: string;
    mood: number[];
    emotion?: string | null;
    riskLevel?: string | null;
    confidence?: number | null;
    profile?: PatientProfile;
  }>;
  queries: Array<{ id: string; patient: string; text: string; age: string; priority: string; status: string }>;
  appointments: Array<{
    id: string;
    place: string;
    clinician: string;
    date: string;
    time: string;
    mode: string;
    status: string;
    patientId: string;
  }>;
};

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

const inferLanguage = (message: string, selected: Language = 'English'): Language => {
  if (/[\u0900-\u097F]/.test(message)) return 'Hindi';
  if (/\b(mai|main|mujhe|mera|meri|kaise|kya|nahi|haan|thoda|bahut|darr|ghabra|tension|madad|samajh|sun|karna|chahiye|hoon|hai)\b/i.test(message)) return 'Hinglish';
  return selected;
};

const supportiveReply = (message: string, language: Language = 'English') => {
  const lower = message.toLowerCase();
  const exam = lower.includes('exam') || lower.includes('परीक्षा');
  const sleep = lower.includes('sleep') || lower.includes('सो') || lower.includes('नींद');
  const alone = lower.includes('alone') || lower.includes('lonely') || lower.includes('अकेल');
  const care = /(nearby|clinic|hospital|psychiatrist|psychologist|therapy|therapist|ngo|centre|center|care)/.test(lower);
  const general = /(what can you do|who are you|help me|start|begin|hello|hi|hey|namaste)/.test(lower);
  const plan = /(plan|small plan|10 minute|priority|pressure)/.test(lower);
  const stuck = /(stuck|cannot figure|where to start|atak|अटक)/.test(lower);
  const pause = /(break|guilty|pause|rest|आराम|विराम)/.test(lower);
  const listen = /(listen|just listen|sun|सुन)/.test(lower);
  const feeling = /(feeling|emotion|understand what i am feeling|name this feeling|triggered)/.test(lower);
  if (language === 'Hindi') {
    if (general) return 'मैं यहां हूं। आप कोई भी सवाल पूछ सकते हैं, या हम यह चुनकर शुरू कर सकते हैं कि अभी किस तरह की मदद चाहिए।';
    if (care) return 'पास की सहायता खोजने के लिए Find care खोलें। वहां city या current location से mental health clinics, hospitals और police stations देख सकते हैं।';
    if (plan) return 'ठीक है, इसे छोटा रखते हैं: पहले 2 मिनट में काम लिखें, फिर 10 मिनट के लिए सबसे आसान काम शुरू करें। अभी सबसे छोटा पहला काम कौन सा है?';
    if (stuck) return 'जब सब कुछ एक साथ दिखता है तो शुरुआत मुश्किल लगती है। अभी सिर्फ एक काम चुनें जो 5-10 मिनट में शुरू हो सके।';
    if (pause) return 'Break लेना avoid करना नहीं है, nervous system को reset करना है। 3 मिनट पानी, धीमी सांस, और screen से नजर हटाकर वापस आएं।';
    if (listen) return 'मैं सुन रहा हूं। अभी सलाह की जल्दी नहीं करते—जो सबसे भारी हिस्सा है, उसे अपने शब्दों में लिख दें।';
    if (feeling) return 'चलो feeling को थोड़ा साफ करते हैं। क्या यह ज्यादा डर, उदासी, गुस्सा, शर्म, या थकान जैसा लग रहा है?';
    if (exam) return 'लगता है exams का pressure बहुत जगह ले रहा है। अभी इसका सबसे मुश्किल हिस्सा क्या लग रहा है?';
    if (sleep) return 'आराम न मिलना हर चीज को भारी बना सकता है। जब आप सोने की कोशिश करते हैं तो आमतौर पर क्या होता है?';
    if (alone) return 'मुश्किल चीजों के साथ अकेला महसूस करना दर्द दे सकता है। मैं सुनने के लिए यहां हूं—आज का दिन कैसा रहा?';
    return 'मैं समझ रहा हूं कि अभी यह बहुत भारी लग रहा है। किस हिस्से पर पहले बात करना सबसे helpful लगेगा?';
  }
  if (language === 'Hinglish') {
    if (general) return 'Main yahan hoon. Aap koi bhi question pooch sakte ho, ya hum choose kar sakte hain ki abhi kis type ki help chahiye.';
    if (care) return 'Nearby support ke liye Find care open karo. Wahan city ya current location se mental health clinics, hospitals aur police stations milenge.';
    if (plan) return 'Theek hai, chhota plan banate hain: 2 minutes mein tasks likho, phir 10 minutes ke liye sabse easy task start karo. Abhi sabse chhota first step kya ho sakta hai?';
    if (stuck) return 'Jab sab kuch ek saath dikhta hai, start karna hard lagta hai. Abhi sirf ek 5-10 minute wala step choose karo; complete karna zaroori nahi.';
    if (pause) return 'Break lena avoid karna nahi hai; body ko reset dena hai. 3 minutes water, slow breathing, aur screen se nazar hatao, phir wapas aao.';
    if (listen) return 'Main sun raha hoon. Advice ki jaldi nahi karte—jo sabse heavy part hai, apne words mein likho.';
    if (feeling) return 'Chalo feeling ko name karte hain. Ye zyada fear, sadness, anger, shame, ya tiredness jaisa lag raha hai?';
    if (exam) return 'Lagta hai exams ka pressure kaafi space le raha hai. Abhi iska sabse difficult part kya feel ho raha hai?';
    if (sleep) return 'Rest na milna sab kuch heavier bana sakta hai. Jab sone ki try karte ho, usually kya hota hai?';
    if (alone) return 'Difficult cheez ke saath lonely feel karna hurt kar sakta hai. Main sunne ke liye yahan hoon—aaj ka din kaisa raha?';
    return 'Mujhe sunai de raha hai ki abhi ye kaafi heavy hai. Kis part ko pehle talk through karna helpful lagega?';
  }
  if (general) return 'I can answer general questions, listen to what you are going through, suggest small coping steps, and point you toward urgent or nearby support when safety or health is involved.';
  if (care) return 'I can help you look for nearby support. Use Find care to search by city or current location, then filter mental health clinics, hospitals, or police stations.';
  if (plan) return 'Let’s make this practical. Write every task down for two minutes, pick the easiest useful one, work on it for ten minutes, then pause and choose the next step.';
  if (stuck) return 'Feeling stuck usually means the problem is too large to hold at once. Let’s shrink it: choose one action that takes 5-10 minutes and does not need to be perfect.';
  if (pause) return 'A short break is not failure; it is a reset. Try three minutes away from the screen, sip water, relax your jaw and shoulders, then return to one small next step.';
  if (listen) return 'I’m listening. No advice first: tell me the part that feels heaviest, and I’ll reflect it back clearly.';
  if (feeling) return 'Let’s name it gently. Does this feel closer to fear, sadness, anger, shame, exhaustion, or a mix of several?';
  return exam
    ? 'It sounds like the pressure around your exams is taking up a lot of space. What feels most difficult about it right now?'
    : sleep
      ? 'Not being able to rest can make everything feel heavier. Would you like to tell me what usually happens when you try to sleep?'
      : alone
        ? 'Feeling alone with something difficult can hurt. I’m here to listen—what has today been like for you?'
        : 'I’m hearing that this is a lot to hold right now. What part would feel most helpful to talk through first?';
};

const adaptiveChoices = (message: string, language: Language = 'English') => {
  const lower = message.toLowerCase();
  if (/(nearby|clinic|hospital|psychiatrist|psychologist|therapy|therapist|ngo|centre|center|care|police|danger|unsafe)/.test(lower)) {
    return [
      { label: language === 'Hindi' ? 'Nearby care खोजें' : language === 'Hinglish' ? 'Nearby care find karo' : 'Find nearby care', value: 'Help me find nearby care.' },
      { label: language === 'Hindi' ? 'Mental support' : 'Mental support', value: 'I need mental health support.' },
      { label: language === 'Hindi' ? 'Urgent physical help' : 'Urgent physical help', value: 'I need urgent physical safety help.' },
    ];
  }
  if (/(plan|stuck|start|pressure|exam|work|study|break|guilty)/.test(lower)) {
    return [
      { label: language === 'Hindi' ? '10 मिनट का plan' : language === 'Hinglish' ? '10 minute plan' : 'Make a 10 minute plan', value: 'Help me make a 10 minute plan.' },
      { label: language === 'Hindi' ? 'Body calm करें' : language === 'Hinglish' ? 'Body calm karo' : 'Calm my body first', value: 'Help me calm my body first.' },
      { label: language === 'Hindi' ? 'एक priority चुनें' : language === 'Hinglish' ? 'One priority choose karo' : 'Choose one priority', value: 'Help me choose only one priority.' },
    ];
  }
  return [
    { label: language === 'Hindi' ? 'Feeling समझने में मदद' : language === 'Hinglish' ? 'Feeling samjho' : 'Help me understand what I’m feeling', value: 'I want help understanding what I am feeling.' },
    { label: language === 'Hindi' ? 'एक छोटा step' : language === 'Hinglish' ? 'One small step' : 'Give me one small thing to try', value: 'Please give me one small thing I can try right now.' },
    { label: language === 'Hindi' ? 'बस सुनिए' : language === 'Hinglish' ? 'Bas listen karo' : 'I just need you to listen', value: 'I do not need advice yet; please listen.' },
  ];
};

export const mockChatService: ChatService = {
  async send(message, signal, language) {
    await delay(800, signal);
    const resolvedLanguage = inferLanguage(message, language);
    const lower = message.toLowerCase();
    const urgent = ['call the police', 'call police', 'police', 'emergency', 'being attacked', 'assault', 'in danger', 'can’t breathe', "can't breathe", 'severe bleeding', 'overdose', 'fire'].some((phrase) =>
      lower.includes(phrase),
    );
    const care = /(nearby|clinic|hospital|psychiatrist|psychologist|therapy|therapist|ngo|centre|center|care)/.test(lower);
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: urgent
        ? 'Your immediate physical safety matters more than continuing this chat. Move to a safer public place if you can and call emergency services now if there is immediate danger.'
        : supportiveReply(message, resolvedLanguage),
      createdAt: new Date().toISOString(),
      choices: urgent ? [] : adaptiveChoices(message, resolvedLanguage),
      actions: urgent ? [
        { label: 'Call emergency services (112)', href: 'tel:112', tone: 'danger' },
        { label: 'Open safety resources', href: '/crisis', tone: 'secondary' },
      ] : care ? [
        { label: 'Find nearby care', href: '/consultancy', tone: 'primary' },
        { label: 'Open crisis resources', href: '/crisis', tone: 'secondary' },
      ] : [],
      urgency: urgent ? 'urgent' : 'support',
    };
  },
};

export const apiChatService: ChatService = {
  async load(signal) {
    await ensureSession(signal);
    const data = await apiAuthed<{ messages: ChatMessage[] }>('/api/chat/conversation', { signal });
    return data.messages;
  },
  async send(message, signal, language) {
    await ensureSession(signal);
    const data = await apiAuthed<{
      flagged: boolean;
      assistantMessage: ChatMessage | null;
    }>('/api/chat/send', { method: 'POST', body: { message, language }, signal });
    if (!data.assistantMessage) {
      const err = new Error('FLAGGED') as Error & { flagged: boolean };
      err.flagged = true;
      throw err;
    }
    return { ...data.assistantMessage, flagged: data.flagged } as ChatMessage & { flagged?: boolean };
  },
  async clear(signal) {
    const data = await apiAuthed<{ messages: ChatMessage[] }>('/api/chat/conversation', {
      method: 'DELETE',
      signal,
    });
    return data.messages;
  },
  async feedback(messageId, value, signal) {
    await apiAuthed('/api/chat/feedback', {
      method: 'POST',
      body: { messageId, feedback: value },
      signal,
    });
  },
};

export const mockServices = {
  recordings: <ConversationRecordingService>{
    async upload(blob, signal) {
      await delay(120, signal);
      return { id: crypto.randomUUID(), filename: 'local-recording.webm', sizeBytes: blob.size };
    },
    async list(signal) {
      await delay(80, signal);
      return [];
    },
    async get(_id, signal) {
      await delay(80, signal);
      throw new Error('Recording preview is unavailable in local mode.');
    },
    async remove(_id, signal) {
      await delay(80, signal);
    },
  },
  voiceTranscription: <VoiceTranscriptionService>{
    async transcribe(_blob, signal) {
      await delay(250, signal);
      return 'Prototype transcript: I would like someone to listen.';
    },
  },
  voiceAnalysis: <VoiceAnalysisService>{
    async analyze(_blob, signal) {
      await delay(250, signal);
      return {
        pace: 'Steady',
        pauses: 'Some',
        energy: 'Moderate',
        voiceActivity: 'Present',
        possibleTone: 'Reflective',
      };
    },
  },
  riskScreening: <RiskScreeningService>{
    async screen(text, signal) {
      await delay(50, signal);
      return { flagged: ['suicide', 'want to die', 'hurt myself'].some((p) => text.toLowerCase().includes(p)) };
    },
  },
  wellbeingAnalysis: <WellbeingAnalysisService>{
    async analyze(_input, signal) {
      await delay(500, signal);
      return {
        distress: 'Elevated',
        safetyConcern: 'Low',
        stress: 'Elevated',
        socialIsolation: 'Moderate',
        sleepDisruption: 'Moderate',
        escalation: 'Moderate',
        confidence: 72,
        factors: ['Recent pressure', 'Interrupted sleep'],
      };
    },
  },
  authentication: <AuthenticationService>{
    async signIn() {
      throw new Error('API not configured');
    },
    async signUp() {
      throw new Error('API not configured');
    },
    async me() {
      return null;
    },
    async signOut() {
      setToken(null);
    },
  },
  userProfile: <UserProfileService>{
    async update(input, signal) {
      await delay(100, signal);
      return input;
    },
    async getDetails(signal) {
      await delay(80, signal);
      try {
        const raw = localStorage.getItem('wellbeing-support:profile-details');
        return raw
          ? (JSON.parse(raw) as UserProfileDetails)
          : { location: '', abhaId: '', phone: '', gender: '', age: null, skipped: false };
      } catch {
        return { location: '', abhaId: '', phone: '', gender: '', age: null, skipped: false };
      }
    },
    async saveDetails(input, signal) {
      await delay(100, signal);
      const next: UserProfileDetails = {
        location: input.location ?? '',
        abhaId: input.abhaId ?? '',
        phone: input.phone ?? '',
        gender: input.gender ?? '',
        age: input.age ?? null,
        skipped: Boolean(input.skipped),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('wellbeing-support:profile-details', JSON.stringify(next));
      return next;
    },
  },
  journal: <JournalService>{
    async list(signal) {
      await delay(80, signal);
      return [];
    },
  },
  mood: <MoodService>{
    async list(signal) {
      await delay(80, signal);
      return [];
    },
  },
  safetyPlan: <SafetyPlanService>{
    async save(plan, signal) {
      await delay(100, signal);
      return plan;
    },
  },
  notification: <NotificationService>{
    async send() {
      throw new Error('API not configured');
    },
  },
  counsellor: <CounsellorService>{
    async request() {
      throw new Error('API not configured');
    },
  },
  emergency: <EmergencyService>{
    async connect() {
      throw new Error('API not configured');
    },
  },
  organization: <OrganizationService>{
    async validateCode(code, _ageBand, signal) {
      await delay(100, signal);
      return { valid: ['CAMPUS-DEMO', 'TEAM-CARE'].includes(code.toUpperCase()) };
    },
  },
  analytics: <AnalyticsService>{
    async track(_event, _meta, signal) {
      await delay(10, signal);
    },
  },
  care: <CareService>{
    async listPlaces() {
      return [];
    },
    async listAppointments() {
      return [];
    },
    async bookAppointment() {
      throw new Error('API not configured');
    },
    async updateAppointment() {
      throw new Error('API not configured');
    },
  },
  professional: <ProfessionalService>{
    async dashboard() {
      throw new Error('API not configured');
    },
    async replyQuery() {
      throw new Error('API not configured');
    },
    async resolveQuery() {
      throw new Error('API not configured');
    },
    async setAvailability() {
      throw new Error('API not configured');
    },
  },
};

export const apiServices = {
  chat: apiChatService,
  voiceTranscription: <VoiceTranscriptionService>{
    async transcribe(blob, signal) {
      const data = await apiAuthed<{ transcript: string }>('/api/wellbeing/voice/transcribe', {
        method: 'POST',
        body: blob,
        signal,
      });
      return data.transcript;
    },
  },
  voiceAnalysis: <VoiceAnalysisService>{
    async analyze(blob, signal) {
      return apiAuthed<Record<string, string>>('/api/wellbeing/voice/analyze', {
        method: 'POST',
        body: { sizeBytes: blob.size },
        signal,
      });
    },
  },
  recordings: <ConversationRecordingService>{
    async upload(blob, signal) {
      return apiAuthed('/api/chat/recordings', { method: 'POST', body: blob, signal });
    },
    async list(signal) {
      return apiAuthed<ConversationRecording[]>('/api/chat/recordings', { signal });
    },
    async get(id, signal) {
      return apiAuthed<Blob>(`/api/chat/recordings/${encodeURIComponent(id)}/file`, { signal, responseType: 'blob' });
    },
    async remove(id, signal) {
      await apiAuthed(`/api/chat/recordings/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
    },
  },
  riskScreening: <RiskScreeningService>{
    async screen(text, signal) {
      return apiAuthed<{ flagged: boolean }>('/api/wellbeing/risk-screen', {
        method: 'POST',
        body: { text },
        signal,
      });
    },
  },
  wellbeingAnalysis: <WellbeingAnalysisService>{
    async analyze(input, signal) {
      return apiAuthed<WellbeingSnapshot>('/api/wellbeing/analyze', {
        method: 'POST',
        body: { answers: (input.answers as string[]) || [] },
        signal,
      });
    },
  },
  authentication: <AuthenticationService>{
    async signIn(email, password, signal) {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/signin', {
        method: 'POST',
        body: { email, password },
        auth: false,
        signal,
      });
      setToken(data.token);
      return data;
    },
    async signUp(input, signal) {
      const data = await apiFetch<{ token: string; user: AuthUser; needsProfile?: boolean }>('/api/auth/signup', {
        method: 'POST',
        body: input,
        auth: false,
        signal,
      });
      setToken(data.token);
      return data;
    },
    async me(signal) {
      if (!getToken()) return null;
      try {
        const data = await apiFetch<{ user: AuthUser }>('/api/auth/me', { signal });
        return data.user;
      } catch {
        return null;
      }
    },
    async signOut() {
      setToken(null);
    },
  },
  userProfile: <UserProfileService>{
    async getConsent(signal) {
      return apiAuthed<ContactConsent>('/api/profile/consent', { signal });
    },
    async update(input, signal) {
      return apiAuthed<ContactConsent>('/api/profile/consent', {
        method: 'PUT',
        body: input,
        signal,
      });
    },
    async getDetails(signal) {
      return apiAuthed<UserProfileDetails>('/api/profile/details', { signal });
    },
    async saveDetails(input, signal) {
      return apiAuthed<UserProfileDetails>('/api/profile/details', {
        method: 'PUT',
        body: input,
        signal,
      });
    },
  },
  journal: <JournalService>{
    async list(signal) {
      return apiAuthed<JournalEntry[]>('/api/journal', { signal });
    },
    async create(entry, signal) {
      return apiAuthed<JournalEntry>('/api/journal', {
        method: 'POST',
        body: {
          title: entry.title,
          body: entry.body,
          mood: entry.mood,
          tags: entry.tags,
          pinned: entry.pinned,
        },
        signal,
      });
    },
    async update(id, entry, signal) {
      return apiAuthed<JournalEntry>(`/api/journal/${id}`, {
        method: 'PUT',
        body: entry,
        signal,
      });
    },
    async remove(id, signal) {
      await apiAuthed(`/api/journal/${id}`, { method: 'DELETE', signal });
    },
  },
  mood: <MoodService>{
    async list(signal) {
      return apiAuthed<MoodEntry[]>('/api/mood', { signal });
    },
    async create(entry, signal) {
      return apiAuthed<MoodEntry>('/api/mood', {
        method: 'POST',
        body: {
          mood: entry.mood,
          intensity: entry.intensity,
          note: entry.note,
          tags: entry.tags,
          date: entry.date,
        },
        signal,
      });
    },
  },
  safetyPlan: <SafetyPlanService>{
    async get(signal) {
      return apiAuthed<SafetyPlan>('/api/safety-plan', { signal });
    },
    async save(plan, signal) {
      return apiAuthed<SafetyPlan>('/api/safety-plan', { method: 'PUT', body: plan, signal });
    },
  },
  notification: <NotificationService>{
    async send(input, signal) {
      return apiAuthed('/api/notifications/send', { method: 'POST', body: input, signal });
    },
  },
  counsellor: <CounsellorService>{
    async request(input, signal) {
      return apiAuthed('/api/counsellor/request', { method: 'POST', body: input ?? {}, signal });
    },
  },
  emergency: <EmergencyService>{
    async connect(signal) {
      return apiAuthed('/api/emergency/connect', { method: 'POST', body: {}, signal });
    },
  },
  organization: <OrganizationService>{
    async validateCode(code, ageBand, signal) {
      return apiAuthed('/api/organizations/validate', {
        method: 'POST',
        body: { code, ageBand },
        signal,
      });
    },
    async aggregates(code, signal) {
      return apiAuthed(`/api/organizations/${encodeURIComponent(code)}/aggregates`, { signal });
    },
  },
  analytics: <AnalyticsService>{
    async track(event, meta, signal) {
      await apiAuthed('/api/analytics/track', {
        method: 'POST',
        body: { event, meta },
        signal,
      });
    },
  },
  care: <CareService>{
    async listPlaces(signal) {
      return apiFetch<CarePlaceDto[]>('/api/care/places', { auth: false, signal });
    },
    async listAppointments(signal) {
      return apiAuthed<AppointmentDto[]>('/api/care/appointments', { signal });
    },
    async bookAppointment(input, signal) {
      return apiAuthed<AppointmentDto>('/api/care/appointments', {
        method: 'POST',
        body: input,
        signal,
      });
    },
    async updateAppointment(id, status, signal) {
      return apiAuthed(`/api/care/appointments/${id}`, {
        method: 'PATCH',
        body: { status },
        signal,
      });
    },
  },
  professional: <ProfessionalService>{
    async dashboard(signal) {
      return apiAuthed<ProfessionalDashboard>('/api/professional/dashboard', { signal });
    },
    async replyQuery(id, reply, signal) {
      await apiAuthed(`/api/professional/queries/${id}/reply`, {
        method: 'POST',
        body: { reply },
        signal,
      });
    },
    async resolveQuery(id, signal) {
      await apiAuthed(`/api/professional/queries/${id}/resolve`, { method: 'POST', body: {}, signal });
    },
    async setAvailability(input, signal) {
      await apiAuthed('/api/professional/availability', { method: 'PATCH', body: input, signal });
    },
    async notifications(signal) {
      return apiAuthed<EmailNotificationLog[]>('/api/professional/notifications', { signal });
    },
  },
};

/** Active services: API when configured, otherwise local mocks. */
export function getServices() {
  return isApiEnabled() ? apiServices : { ...mockServices, chat: mockChatService };
}

/** @deprecated Use getServices() — kept for compatibility */
export class FutureApiServices {
  chat = apiChatService;
  voiceTranscription = apiServices.voiceTranscription;
  voiceAnalysis = apiServices.voiceAnalysis;
  recordings = apiServices.recordings;
  riskScreening = apiServices.riskScreening;
  wellbeingAnalysis = apiServices.wellbeingAnalysis;
  authentication = apiServices.authentication;
  userProfile = apiServices.userProfile;
  journal = apiServices.journal;
  mood = apiServices.mood;
  safetyPlan = apiServices.safetyPlan;
  notification = apiServices.notification;
  counsellor = apiServices.counsellor;
  emergency = apiServices.emergency;
  organization = apiServices.organization;
  analytics = apiServices.analytics;
}


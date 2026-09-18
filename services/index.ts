import type {
  ChatMessage,
  ContactConsent,
  JournalEntry,
  MoodEntry,
  SafetyPlan,
  WellbeingSnapshot,
} from '@/types';
import { apiAuthed, apiFetch, ensureSession, getToken, isApiEnabled, setToken } from '@/lib/api';

export type ServiceResult<T> = { data: T | null; loading: boolean; error: string | null };

export interface ChatService {
  send(message: string, signal?: AbortSignal): Promise<ChatMessage>;
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
}

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

const supportiveReply = (message: string) =>
  message.toLowerCase().includes('exam')
    ? 'It sounds like the pressure around your exams is taking up a lot of space. What feels most difficult about it right now?'
    : message.toLowerCase().includes('sleep')
      ? 'Not being able to rest can make everything feel heavier. Would you like to tell me what usually happens when you try to sleep?'
      : message.toLowerCase().includes('alone')
        ? 'Feeling alone with something difficult can hurt. I’m here to listen—what has today been like for you?'
        : 'I’m hearing that this is a lot to hold right now. What part would feel most helpful to talk through first?';

export const mockChatService: ChatService = {
  async send(message, signal) {
    await delay(800, signal);
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: supportiveReply(message),
      createdAt: new Date().toISOString(),
    };
  },
};

export const apiChatService: ChatService = {
  async load(signal) {
    await ensureSession(signal);
    const data = await apiAuthed<{ messages: ChatMessage[] }>('/api/chat/conversation', { signal });
    return data.messages;
  },
  async send(message, signal) {
    await ensureSession(signal);
    const data = await apiAuthed<{
      flagged: boolean;
      assistantMessage: ChatMessage | null;
    }>('/api/chat/send', { method: 'POST', body: { message }, signal });
    if (data.flagged || !data.assistantMessage) {
      const err = new Error('FLAGGED') as Error & { flagged: boolean };
      err.flagged = true;
      throw err;
    }
    return data.assistantMessage;
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
        body: { sizeBytes: blob.size, mimeType: blob.type },
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

import type { ChatMessage, ContactConsent, JournalEntry, MoodEntry, SafetyPlan, WellbeingSnapshot } from '@/types';
export type ServiceResult<T> = { data:T|null; loading:boolean; error:string|null };
export interface ChatService { send(message:string, signal?:AbortSignal):Promise<ChatMessage> }
export interface VoiceTranscriptionService { transcribe(blob:Blob, signal?:AbortSignal):Promise<string> }
export interface VoiceAnalysisService { analyze(blob:Blob, signal?:AbortSignal):Promise<Record<string,string>> }
export interface RiskScreeningService { screen(text:string, signal?:AbortSignal):Promise<{flagged:boolean}> }
export interface WellbeingAnalysisService { analyze(input:Record<string,unknown>, signal?:AbortSignal):Promise<WellbeingSnapshot> }
export interface AuthenticationService { signIn(signal?:AbortSignal):Promise<never> }
export interface UserProfileService { update(input:ContactConsent, signal?:AbortSignal):Promise<ContactConsent> }
export interface JournalService { list(signal?:AbortSignal):Promise<JournalEntry[]> }
export interface MoodService { list(signal?:AbortSignal):Promise<MoodEntry[]> }
export interface SafetyPlanService { save(plan:SafetyPlan, signal?:AbortSignal):Promise<SafetyPlan> }
export interface NotificationService { send(signal?:AbortSignal):Promise<never> }
export interface CounsellorService { request(signal?:AbortSignal):Promise<never> }
export interface EmergencyService { connect(signal?:AbortSignal):Promise<never> }
export interface OrganizationService { validateCode(code:string, signal?:AbortSignal):Promise<boolean> }
export interface AnalyticsService { track(event:string, signal?:AbortSignal):Promise<void> }
const delay = (ms:number, signal?:AbortSignal) => new Promise<void>((resolve,reject) => { const id=setTimeout(resolve,ms); signal?.addEventListener('abort',()=>{clearTimeout(id);reject(new DOMException('Aborted','AbortError'));}); });
const supportiveReply = (message:string) => message.toLowerCase().includes('exam') ? 'It sounds like the pressure around your exams is taking up a lot of space. What feels most difficult about it right now?' : message.toLowerCase().includes('sleep') ? 'Not being able to rest can make everything feel heavier. Would you like to tell me what usually happens when you try to sleep?' : message.toLowerCase().includes('alone') ? 'Feeling alone with something difficult can hurt. I’m here to listen—what has today been like for you?' : 'I’m hearing that this is a lot to hold right now. What part would feel most helpful to talk through first?';
export const mockChatService:ChatService = { async send(message,signal){ await delay(800,signal); return {id:crypto.randomUUID(),role:'assistant',text:supportiveReply(message),createdAt:new Date().toISOString()}; } };
export class FutureApiChatService implements ChatService { async send(message:string,signal?:AbortSignal):Promise<ChatMessage>{ void message; void signal; throw new Error('Future API integration is not configured.'); } }

const notConfigured = () => Promise.reject(new Error('Future API integration is not configured.'));
export const mockServices = {
  voiceTranscription: <VoiceTranscriptionService>{ async transcribe(_blob,signal){ await delay(250,signal); return 'Prototype transcript: I would like someone to listen.' } },
  voiceAnalysis: <VoiceAnalysisService>{ async analyze(_blob,signal){ await delay(250,signal); return {pace:'Steady',pauses:'Some',energy:'Moderate',voiceActivity:'Present',possibleTone:'Reflective'} } },
  riskScreening: <RiskScreeningService>{ async screen(text,signal){ await delay(50,signal); return {flagged:['suicide','want to die','hurt myself'].some(p=>text.toLowerCase().includes(p))} } },
  wellbeingAnalysis: <WellbeingAnalysisService>{ async analyze(_input,signal){ await delay(500,signal); return {distress:'Elevated',safetyConcern:'Low',stress:'Elevated',socialIsolation:'Moderate',sleepDisruption:'Moderate',escalation:'Moderate',confidence:72,factors:['Recent pressure','Interrupted sleep']} } },
  authentication: <AuthenticationService>{ signIn:notConfigured },
  userProfile: <UserProfileService>{ async update(input,signal){ await delay(100,signal); return input } },
  journal: <JournalService>{ async list(signal){ await delay(80,signal); return [] } },
  mood: <MoodService>{ async list(signal){ await delay(80,signal); return [] } },
  safetyPlan: <SafetyPlanService>{ async save(plan,signal){ await delay(100,signal); return plan } },
  notification: <NotificationService>{ send:notConfigured }, counsellor:<CounsellorService>{ request:notConfigured }, emergency:<EmergencyService>{ connect:notConfigured },
  organization:<OrganizationService>{ async validateCode(code,signal){ await delay(100,signal); return ['CAMPUS-DEMO','TEAM-CARE'].includes(code.toUpperCase()) } },
  analytics:<AnalyticsService>{ async track(_event,signal){ await delay(10,signal) } },
};

/** Placeholder boundary for future HTTP implementations. No request or credential exists in this frontend build. */
export class FutureApiServices {
  chat:ChatService = new FutureApiChatService();
  voiceTranscription:VoiceTranscriptionService={transcribe:notConfigured}; voiceAnalysis:VoiceAnalysisService={analyze:notConfigured}; riskScreening:RiskScreeningService={screen:notConfigured}; wellbeingAnalysis:WellbeingAnalysisService={analyze:notConfigured};
  authentication:AuthenticationService={signIn:notConfigured}; userProfile:UserProfileService={update:notConfigured}; journal:JournalService={list:notConfigured}; mood:MoodService={list:notConfigured}; safetyPlan:SafetyPlanService={save:notConfigured}; notification:NotificationService={send:notConfigured}; counsellor:CounsellorService={request:notConfigured}; emergency:EmergencyService={connect:notConfigured}; organization:OrganizationService={validateCode:notConfigured}; analytics:AnalyticsService={track:notConfigured};
}

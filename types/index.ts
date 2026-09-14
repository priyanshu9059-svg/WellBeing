export type Language = 'English' | 'Hindi' | 'Hinglish';
export type Level = 'Low' | 'Moderate' | 'Elevated' | 'High';
export interface UserSession { id:string; anonymous:boolean; language:Language; createdAt:string }
export interface AnonymousSession extends UserSession { anonymous:true; displayId:string }
export interface ChatMessage { id:string; role:'user'|'assistant'; text:string; createdAt:string; feedback?:'helpful'|'not-helpful' }
export interface Conversation { id:string; title:string; messages:ChatMessage[]; updatedAt:string }
export interface MoodEntry { id:string; date:string; mood:number; intensity:number; note:string; tags:string[] }
export interface JournalEntry { id:string; title:string; body:string; mood:string; tags:string[]; date:string; pinned:boolean }
export interface ExerciseSession { exerciseId:string; startedAt:string; completedAt?:string; reflection?:string }
export interface VoiceSignal { pace:string; pauses:string; energy:string; voiceActivity:string; possibleTone:string }
export interface CameraSignal { activity:'Low'|'Moderate'|'High'; capturedAt:string }
export interface WellbeingSnapshot { distress:Level; safetyConcern:Level; stress:Level; socialIsolation:Level; sleepDisruption:Level; escalation:Level; confidence:number; factors:string[] }
export interface SafetyPlan { warningSigns:string[]; harderSituations:string[]; selfActions:string[]; saferPlaces:string[]; trustedPeople:string[]; professionalContacts:string[]; reasons:string[]; reduceDanger:string[]; emergencyResources:string[] }
export interface CrisisResource { name:string; number?:string; description:string; href?:string }
export interface ContactConsent { anonymous:boolean; allowContact:boolean; allowWellbeingSummary:boolean; mobile:string; email:string; preferredMethod:string; preferredTime:string }
export interface OrganizationAccess { code:string; valid:boolean; ageBand:string; anonymous:true }
export interface AggregateInsight { label:string; value:number; groupSize:number }
export interface PrivacyPreferences { anonymous:boolean; allowContact:boolean; allowWellbeingSummary:boolean; language:Language }

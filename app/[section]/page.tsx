import { AppShell } from '@/components/app-shell';
import { ChatExperience } from '@/features/chat/chat-experience';
import { VideoChatPage } from '@/features/chat/video-chat-page';
import { ExerciseLibrary } from '@/features/exercises/exercise-library';
import { AccessCode, OrganizationDemo } from '@/features/organizations/organization-pages';
import { PrivacyCenter } from '@/features/privacy/privacy-center';
import { SafetyPlan } from '@/features/safety/safety-plan';
import { AboutPage, CrisisPage, FaqPage, NotFound, OfflinePage, SettingsPage, SupportHome, TrustPage } from '@/features/static/pages';
import { ConsultancyHub } from '@/features/consultancy/consultancy-hub';
import { ProfessionalPortal } from '@/features/professional/professional-portal';
import { ProfileDetailsPage } from '@/features/profile/profile-details';
import { LoginPage } from '@/features/auth/login-page';
import type { TranslationKey } from '@/components/language-provider';

const pageMap:Record<string,{title:TranslationKey;description?:TranslationKey;content:React.ReactNode}> = {
  support:{title:'supportTitle',description:'supportDescription',content:<SupportHome/>},
  login:{title:'signupTitle',description:'signupDescription',content:<LoginPage/>},
  chat:{title:'chatTitle',description:'chatDescription',content:<ChatExperience/>},
  'video-chat':{title:'chatTitle',description:'chatDescription',content:<VideoChatPage/>},
  exercises:{title:'exercisesTitle',description:'exercisesDescription',content:<ExerciseLibrary/>},
  wellbeing:{title:'wellbeingTitle',description:'wellbeingDescription',content:<ChatExperience/>},
  consultancy:{title:'consultancyTitle',description:'consultancyDescription',content:<ConsultancyHub/>},
  professional:{title:'professionalTitle',description:'professionalDescription',content:<ProfessionalPortal/>},
  'safety-plan':{title:'safetyTitle',description:'safetyDescription',content:<SafetyPlan/>},
  crisis:{title:'crisisTitle',description:'crisisDescription',content:<CrisisPage/>},
  privacy:{title:'privacyTitle',description:'privacyDescription',content:<PrivacyCenter/>},
  settings:{title:'settingsTitle',description:'settingsDescription',content:<SettingsPage/>},
  signup:{title:'signupTitle',description:'signupDescription',content:<LoginPage/>},
  'complete-profile':{title:'completeProfileTitle',description:'completeProfileDescription',content:<ProfileDetailsPage mode="complete"/>},
  profile:{title:'profileTitle',description:'profileDescription',content:<ProfileDetailsPage mode="edit"/>},
  'access-code':{title:'accessTitle',description:'accessDescription',content:<AccessCode/>},
  'organization-demo':{title:'orgTitle',description:'orgDescription',content:<OrganizationDemo/>},
  trust:{title:'trustTitle',description:'trustDescription',content:<TrustPage/>},
  about:{title:'aboutTitle',description:'aboutDescription',content:<AboutPage/>},
  faq:{title:'faqTitle',description:'faqDescription',content:<FaqPage/>},
  offline:{title:'offlineTitle',content:<OfflinePage/>},
};

export default async function SectionPage({params}:{params:Promise<{section:string}>}) {
  const {section}=await params;
  const page=pageMap[section] ?? {title:'notFoundTitle',content:<NotFound/>};
  if (section === 'professional') return <div className="professional-standalone">{page.content}</div>;
  return <AppShell title={page.title} description={page.description}>{page.content}</AppShell>;
}

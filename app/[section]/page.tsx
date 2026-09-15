import { AppShell } from '@/components/app-shell';
import { ChatExperience } from '@/features/chat/chat-experience';
import { ExerciseLibrary } from '@/features/exercises/exercise-library';
import { Journal } from '@/features/journal/journal';
import { MoodDashboard } from '@/features/mood/mood-dashboard';
import { AccessCode, OrganizationDemo } from '@/features/organizations/organization-pages';
import { PrivacyCenter } from '@/features/privacy/privacy-center';
import { SafetyPlan } from '@/features/safety/safety-plan';
import { AboutPage, CrisisPage, FaqPage, NotFound, OfflinePage, SettingsPage, SupportHome, TrustPage } from '@/features/static/pages';
import { WellbeingAnalysis } from '@/features/wellbeing/wellbeing-analysis';
import { ConsultancyHub } from '@/features/consultancy/consultancy-hub';
import { ProfessionalPortal } from '@/features/professional/professional-portal';

const pageMap:Record<string,{title:string;description?:string;content:React.ReactNode}> = {
  support:{title:'What would help right now?',description:'Choose one small place to begin. You can change direction at any time.',content:<SupportHome/>},
  chat:{title:'A quiet conversation',description:'Share as much or as little as feels comfortable.',content:<ChatExperience/>},
  mood:{title:'Notice your emotional weather',description:'Check in without judgment and look for gentle patterns over time.',content:<MoodDashboard/>},
  journal:{title:'A private place for your thoughts',description:'Your entries stay in this browser and are not sent anywhere.',content:<Journal/>},
  exercises:{title:'Make a little room to breathe',description:'Short, guided practices for grounding, rest, and manageable next steps.',content:<ExerciseLibrary/>},
  wellbeing:{title:'Understand what may be weighing on you',description:'Choose what to share and receive a non-diagnostic prototype snapshot.',content:<WellbeingAnalysis/>},
  consultancy:{title:'Find care near you',description:'Explore nearby professional support and manage appointment requests in one place.',content:<ConsultancyHub/>},
  professional:{title:'Professional care workspace',description:'A prototype portal for counsellors, psychologists, and psychiatrists.',content:<ProfessionalPortal/>},
  'safety-plan':{title:'Your personal safety plan',description:'Prepare supportive steps before a difficult moment becomes overwhelming.',content:<SafetyPlan/>},
  crisis:{title:'Urgent help is available',description:'You choose if and when to contact a verified support service.',content:<CrisisPage/>},
  privacy:{title:'Privacy center',description:'See and control what this prototype stores in your browser.',content:<PrivacyCenter/>},
  settings:{title:'Settings',description:'Adjust language, privacy, and comfort preferences.',content:<SettingsPage/>},
  'access-code':{title:'Anonymous organization access',description:'A demo code can personalize context without asking who you are.',content:<AccessCode/>},
  'organization-demo':{title:'Organization wellbeing overview',description:'Mock aggregate insights with a privacy threshold.',content:<OrganizationDemo/>},
  trust:{title:'Trust and limitations',description:'A plain-language view of what works now and what still needs integration or validation.',content:<TrustPage/>},
  about:{title:'About Wellbeing Support',description:'Why this prototype centers privacy, agency, and small steps.',content:<AboutPage/>},
  faq:{title:'Frequently asked questions',description:'Clear answers about privacy, support, and prototype limits.',content:<FaqPage/>},
  offline:{title:'Offline support',content:<OfflinePage/>},
};

export default async function SectionPage({params}:{params:Promise<{section:string}>}) { const {section}=await params; const page=pageMap[section] ?? {title:'Page not found',content:<NotFound/>}; return <AppShell title={page.title} description={page.description}>{page.content}</AppShell>; }

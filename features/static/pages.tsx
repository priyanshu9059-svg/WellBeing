'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Camera, Check, CircleHelp, ClipboardList, Download, FileText, History, IdCard, Leaf, LogOut, MessageCircle, Phone, Shield, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { crisisResources } from '@/config/crisis-resources';
import { features } from '@/config/features';
import { LanguageSelect, useLanguage } from '@/components/language-provider';
import { getServices, type UserProfileDetails } from '@/services';
import { isApiEnabled } from '@/lib/api';
import { downloadJson } from '@/lib/utils';
import { signOutLocalUser } from '@/lib/local-user-auth';

const tools = [
  { href: '/check-in', title: 'Wellbeing check-in', copy: 'Write or speak about threats, court stress, isolation, or rehab challenges. ML scores support counsellor review.', icon: ClipboardList },
  { href: '/history', title: 'Your history', copy: 'See past check-ins, voice notes, scores, and counsellor appointments on one timeline.', icon: History },
  { href: '/wellbeing', title: 'Wellbeing conversation', copy: 'Talk by voice, type a message, or open a camera-based avatar call.', icon: MessageCircle },
  { href: '/exercises', title: 'Guided exercises', copy: 'Try breathing, grounding, self-compassion, or a next step.', icon: Leaf },
  { href: '/safety-plan', title: 'Personal safety plan', copy: 'Prepare supportive steps, people, places, and resources.', icon: Shield },
];

export function SupportHome() {
  return (
    <div>
      <div className="support-intro">
        <Card className="featured-support">
          <p className="kicker">If talking feels possible</p>
          <h2>Begin with your voice.</h2>
          <p>You do not need to explain everything. The support companion can start as an audio conversation and move at your pace.</p>
          <Link className="btn btn-primary" href="/wellbeing">Open wellbeing conversation <ArrowRight /></Link>
        </Card>
        <Card className="pause-card">
          <span className="pause-visual">◌</span>
          <div>
            <p className="kicker">If words feel difficult</p>
            <h2>Take a two-minute pause.</h2>
            <Link href="/exercises">Try box breathing →</Link>
          </div>
        </Card>
      </div>
      <section>
        <div className="section-heading">
          <p className="kicker">Choose what fits this moment</p>
          <h2>Support tools</h2>
        </div>
        <div className="tool-grid">
          {tools.map((t) => (
            <Link href={t.href} key={t.href} className="tool-card">
              <span className="soft-icon"><t.icon /></span>
              <h3>{t.title}</h3>
              <p>{t.copy}</p>
              <b>Open tool <ArrowRight /></b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CrisisPage() {
  const [note, setNote] = useState('');
  async function contactTrusted() {
    const who = window.prompt('Who would you like to plan to contact? (name or role)');
    if (!who) return;
    setNote(`You planned to reach out to ${who}. This reminder stays on this device.`);
    if (isApiEnabled()) {
      try {
        await getServices().analytics.track('crisis.trusted_contact_plan', { who });
        await getServices().emergency.connect();
      } catch {}
    }
  }
  return (
    <div className="narrow-page crisis-shell">
      <Card className="crisis-warning">
        <div className="crisis-warning-heading"><AlertTriangle /><h2>If you are in immediate danger</h2></div>
        <ol>
          <li><b>Call emergency services (112)</b> immediately if you or someone else is in life-threatening danger.</li>
          <li>Go to the nearest emergency room or hospital.</li>
          <li>Call <b>Tele-MANAS (14416)</b> for mental health support.</li>
          <li>Reach out to a trusted friend, family member, or neighbour and stay with someone safe.</li>
          <li>Move away from anything you could use to hurt yourself or someone else.</li>
        </ol>
        <p><Shield /> You do not have to handle a crisis alone. Help is available right now.</p>
      </Card>
      <Card className="crisis-page">
        <div className="icon-orb crisis">!</div>
        <p className="kicker">Immediate support in India</p>
        <h2>You can reach out right now.</h2>
        <p className="lead">This website cannot dispatch emergency help. It can help you reach verified services.</p>
        <div className="crisis-primary-grid">
          <a className="crisis-call large" href={crisisResources.emergency.href}><Phone /><span><b>Emergency services</b><small>{crisisResources.emergency.number}</small></span></a>
          <a className="crisis-call large" href={crisisResources.teleManas.href}><Phone /><span><b>Tele-MANAS</b><small>{crisisResources.teleManas.number}</small></span></a>
          <a className="crisis-call large emergency" href={crisisResources.ambulance.href}><Phone /><span><b>Ambulance</b><small>{crisisResources.ambulance.number}</small></span></a>
        </div>
        <div className="crisis-helplines">
          <p className="kicker">More helplines</p>
          <div className="crisis-helpline-grid">
            {crisisResources.additional.map((resource) => (
              <a className="crisis-call compact" href={resource.href} key={resource.number}><Phone /><span><b>{resource.name}</b><small>{resource.number}</small></span></a>
            ))}
          </div>
        </div>
        <div className="crisis-other">
          <Link href="/safety-plan">Open my safety plan <ArrowRight /></Link>
          <Link href="/chat">Return to my conversation <ArrowRight /></Link>
          <button onClick={contactTrusted}>Plan how to contact someone I trust <ArrowRight /></button>
        </div>
        {note && <p className="success-text">{note}</p>}
        <p className="fine-print">No call, message, location sharing, or notification happens automatically. Numbers are centralized and must be officially re-verified before production.</p>
      </Card>
    </div>
  );
}

export function TrustPage() {
  const groups: Array<[string, string[]]> = [
    ['Available now', ['Support chat (API or local fallback)', 'Browser voice recording + API transcription hook', 'Mood tracker and journal with DB sync', 'Guided exercises', 'Safety-plan editor', 'Privacy controls', 'Crisis-resource navigation', 'Professional portal + care directory']],
    ['Backend included', ['Auth (anonymous + professional)', 'SQLite/Prisma persistence', 'SMS/email notification logging', 'Counsellor handoff requests', 'Organization codes + aggregates', 'Analytics events', 'Optional OpenAI chat when keyed']],
    ['Requires clinical validation', ['Diagnostic assessments', 'Automated risk scoring', 'PHQ-9 or GAD-7 scoring', 'Treatment recommendations', 'Clinical emotion interpretation', 'Escalation thresholds']],
    ['Still future', ['Live anonymous telephony', 'Verified live provider APIs', 'Full multi-language content', 'Production SMS gateway']],
  ];
  return (
    <div className="trust-grid">
      {groups.map((g, i) => (
        <Card key={g[0]} className={`trust-card trust-${i}`}>
          <span>{i === 0 ? 'Available' : i === 1 ? 'Backend' : i === 2 ? 'Validation' : 'Future'}</span>
          <h2>{g[0]}</h2>
          <ul>{g[1].map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
      ))}
    </div>
  );
}
export function SettingsPage(){
  const {t}=useLanguage();
  const router=useRouter();
  const [section,setSection]=useState<'profile'|'details'|'records'>('profile');
  const [anon,setAnon]=useState(()=>{try{return localStorage.getItem('wellbeing-support:pref-anonymous')!=='false'}catch{return true}});
  const [reduced,setReduced]=useState(()=>{try{return localStorage.getItem('wellbeing-support:pref-reduced-sensory')==='true'}catch{return false}});
  const [profile,setProfile]=useState<UserProfileDetails|null>(null);
  const [storedCount,setStoredCount]=useState(0);
  const [downloaded,setDownloaded]=useState('');
  useEffect(()=>{document.documentElement.dataset.reducedSensory=reduced?'true':'false'},[reduced]);
  useEffect(()=>{
    let cancelled=false;
    function refreshStoredCount(){try{setStoredCount(Object.keys(localStorage).filter(k=>k.startsWith('wellbeing-support:')).length)}catch{setStoredCount(0)}}
    refreshStoredCount();
    getServices().userProfile.getDetails?.().then(details=>{if(!cancelled)setProfile(details)}).catch(()=>{});
    return()=>{cancelled=true};
  },[]);
  function collectRecords(scope:'all'|'profile'|'activity'){
    const data:Record<string,unknown>={};
    const allowed=scope==='profile'
      ? ['wellbeing-support:profile-details','wellbeing-support:current-user','wellbeing-support:contact-consent']
      : scope==='activity'
        ? ['wellbeing-support:conversation','wellbeing-support:journal','wellbeing-support:moods','wellbeing-support:safety-plan','wellbeing-support:appointments']
        : [];
    Object.keys(localStorage)
      .filter(key=>key.startsWith('wellbeing-support:')&&(scope==='all'||allowed.includes(key)))
      .forEach(key=>{try{data[key]=JSON.parse(localStorage.getItem(key)||'null')}catch{data[key]=localStorage.getItem(key)}});
    return data;
  }
  function downloadRecords(scope:'all'|'profile'|'activity'){
    const labels={all:'all records',profile:'profile records',activity:'activity records'};
    downloadJson(`wellbeing-support-${scope}-records.json`,collectRecords(scope));
    setDownloaded(`Downloaded ${labels[scope]}.`);
  }
  async function logOut(){
    try{await getServices().authentication.signOut()}catch{}
    try{signOutLocalUser()}catch{}
    router.push('/login');
  }
  const rows=[
    ['Location',profile?.location],
    ['ABHA ID',profile?.abhaId],
    ['Phone',profile?.phone],
    ['Gender',profile?.gender],
    ['Age',profile?.age!=null?String(profile.age):''],
  ];
  return <div className="settings-page"><Card className="settings-hero"><div><p className="kicker">Account settings</p><h2>Manage your profile and records</h2><p>Keep your account details clear, review optional personal information, and download your saved wellbeing records from this browser.</p></div><span className="settings-state"><Check/>{isApiEnabled()?'API sync available':'Local records'}</span></Card><div className="settings-layout"><aside className="settings-tabs" aria-label="Settings sections"><button className={section==='profile'?'active':''} onClick={()=>setSection('profile')}><UserRound/><span><b>Profile edit</b><small>Name, access, language</small></span></button><button className={section==='details'?'active':''} onClick={()=>setSection('details')}><IdCard/><span><b>Personal details</b><small>Location, ABHA, phone</small></span></button><button className={section==='records'?'active':''} onClick={()=>setSection('records')}><Download/><span><b>Download records</b><small>{storedCount} saved items</small></span></button></aside><Card className="settings-panel">{section==='profile'&&<section><p className="kicker">Profile edit</p><h2>Edit how your account works</h2><div className="settings-form-grid"><div className="field"><span>{t('language')}</span><LanguageSelect id="settings-language"/></div><label className="check"><input type="checkbox" checked={anon} onChange={e=>{setAnon(e.target.checked);localStorage.setItem('wellbeing-support:pref-anonymous',String(e.target.checked))}}/><span><b>{t('anonymousMode')}</b><small>{t('anonymousModeCopy')}</small></span></label><label className="check"><input type="checkbox" checked={reduced} onChange={e=>{setReduced(e.target.checked);localStorage.setItem('wellbeing-support:pref-reduced-sensory',String(e.target.checked))}}/><span><b>{t('reducedSensory')}</b><small>{t('reducedSensoryCopy')}</small></span></label></div><div className="settings-action-row"><Link href="/profile" className="btn btn-primary">Edit profile <ArrowRight/></Link><Link href="/signup" className="btn btn-secondary">Create account</Link><button className="btn btn-danger settings-logout" onClick={logOut}><LogOut/>Log out</button></div></section>}{section==='details'&&<section><p className="kicker">Personal details</p><h2>Review optional details</h2><p className="muted">These fields are optional and can be changed anytime. Share them only when they help your care experience.</p><dl className="settings-detail-grid">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl><div className="settings-action-row"><Link href="/profile" className="btn btn-primary">Update personal details <ArrowRight/></Link><Link href="/privacy" className="btn btn-secondary">Privacy center</Link></div></section>}{section==='records'&&<section><p className="kicker">Download records</p><h2>Export your wellbeing data</h2><p className="muted">Downloads are JSON files created from the Wellbeing Support records saved in this browser. Server records may depend on backend retention settings.</p><div className="record-download-grid"><button onClick={()=>downloadRecords('all')}><Download/><b>All records</b><small>Profile, journal, mood, safety plan, consent, and app data.</small></button><button onClick={()=>downloadRecords('profile')}><IdCard/><b>Profile records</b><small>Account, personal details, and consent preferences.</small></button><button onClick={()=>downloadRecords('activity')}><FileText/><b>Activity records</b><small>Conversation, journal, mood, appointments, and safety plan.</small></button></div>{downloaded&&<p className="success-box"><Check/>{downloaded}</p>}<Link href="/privacy" className="text-link">Open full privacy and data controls →</Link></section>}</Card></div></div>}
export function AboutPage(){return <div className="prose-page"><Card><p className="kicker">About Wellbeing Support</p><h2>Support designed around choice.</h2><p>Wellbeing Support helps people talk, pause, reflect, or prepare. It uses warm language, small steps, and anonymous access by default.</p><p>It is not a therapist, clinician, emergency dispatcher, diagnostic tool, or substitute for professional care. When the API is configured, data can sync to a secure backend you control.</p></Card><Card><h2>Cultural and language awareness</h2><p>People describe distress differently across languages, families, workplaces, campuses, and communities. The interface offers English, Hindi, and Hinglish choices as a prototype; complete translated content and cultural review remain future work.</p></Card></div>}
export function FaqPage(){const qs=[['Is this therapy?','No. It is a wellbeing support app with guided tools and optional AI companion replies — not a clinical service.'],['Is my information private?','Anonymous mode is default. With the API enabled, data syncs to your backend under consent rules. Local browser storage is also used as a cache and is not described as encrypted.'],['Do I need an account?','No for everyday support. Professionals sign in for the care portal. Anonymous sessions still get a secure session token when the API is on.'],['Can this contact emergency services for me?','No automatic dispatch. Phone links open only after you click. Notification and counsellor handoff require your consent.'],['Can it diagnose anxiety or depression?','No. Summaries and voice or camera signals are explicitly non-diagnostic.'],['Will it work offline?','After a successful visit in a supported production browser, the PWA provides a basic offline fallback and locally saved tools.']];return <div className="faq-list">{qs.map(([q,a])=><details key={q}><summary>{q}<CircleHelp/></summary><p>{a}</p></details>)}</div>}
export function OfflinePage(){return <div className="narrow-page"><Card className="empty-state large"><span>☁</span><h2>You appear to be offline</h2><p>Locally saved tools may still be available. Reconnect to load pages that have not been visited before.</p><Link href="/support" className="btn btn-primary">Try support home</Link></Card></div>}
export function NotFound(){return <div className="narrow-page"><Card className="empty-state large"><span>◌</span><h2>This page is not here</h2><p>Nothing went wrong with your session. Choose a support tool to continue.</p><Link href="/support" className="btn btn-primary">Return to support</Link></Card></div>}
export function FeatureFlagsNote(){return <>{features.voice&&<Camera className="sr-only"/>}</>}




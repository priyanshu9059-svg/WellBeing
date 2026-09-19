'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BriefcaseMedical, ClipboardList, HeartHandshake, History, House, Leaf, MapPinned, Menu, MessageCircle, Settings, Shield, ShieldCheck, UserRound, X } from 'lucide-react';
import { CrisisSheet } from './crisis-sheet';
import { PwaRegister } from './pwa-register';
import { brand } from '@/config/brand';
import { LanguageSelect, useLanguage } from '@/components/language-provider';
import type { TranslationKey } from '@/components/language-provider';
import { getServices, type AuthUser } from '@/services';
import { ensureSession, isApiEnabled } from '@/lib/api';

const nav = [
  {href:'/support',labelKey:'supportHome',icon:HeartHandshake},
  {href:'/check-in',labelKey:'checkIn',icon:ClipboardList},
  {href:'/history',labelKey:'history',icon:History},
  {href:'/wellbeing',labelKey:'wellbeing',icon:MessageCircle},
  {href:'/exercises',labelKey:'exercises',icon:Leaf},
  {href:'/consultancy',labelKey:'findCare',icon:MapPinned},
  {href:'/safety-plan',labelKey:'safetyPlan',icon:ShieldCheck},
  {href:'/privacy',labelKey:'privacy',icon:Shield},
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function AppShell({children,title,description}:{children:React.ReactNode;title:TranslationKey;description?:TranslationKey}){
  const path=usePathname(); const [menu,setMenu]=useState(false); const [crisis,setCrisis]=useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const {t}=useLanguage();
  const showProfessionalSwitch = path === '/login' || path === '/signup';
  const signedIn = Boolean(user && !user.anonymous);
  const label = signedIn
    ? (user?.displayName?.trim() || user?.email || 'Signed in')
    : 'Anonymous';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isApiEnabled()) await ensureSession();
        const me = await getServices().authentication.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  return <div className="app-frame"><PwaRegister/><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><Link href="/" className="brand"><span aria-hidden="true">✦</span>{brand.name}</Link><div className="header-tools">{showProfessionalSwitch && <Link href="/professional" className="professional-header-link"><BriefcaseMedical size={16}/><span>{t('forProfessionals')}</span></Link>}<Link href={signedIn ? '/profile' : '/signup'} className={`header-account ${signedIn ? 'signed-in' : 'anonymous'}`} title={signedIn ? 'Your profile' : 'Sign up to save your profile'}><span className="header-account-avatar" aria-hidden="true">{signedIn ? initials(label) : <UserRound size={14} />}</span><span className="header-account-text"><small>{signedIn ? 'Signed in' : 'Browsing as'}</small><b>{label}</b></span></Link><LanguageSelect id="app-language"/><button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle menu">{menu?<X/>:<Menu/>}</button></div></header>
    <div className="app-grid"><aside className={`sidebar ${menu?'open':''}`}><nav aria-label="Support tools"><Link href="/" className="nav-item"><House size={19}/>{t('home')}</Link>{nav.map(item=><Link key={item.href} href={item.href} className={`nav-item ${path===item.href?'active':''}`} onClick={()=>setMenu(false)}><item.icon size={19}/>{t(item.labelKey as Parameters<typeof t>[0])}</Link>)}</nav><div className="side-bottom"><Link href="/settings" className="nav-item"><Settings size={19}/>{t('settings')}</Link><Link href="/trust" className="tiny-link">{t('trustLimitations')}</Link></div></aside>
      <main id="main-content" className="app-main"><div className="page-heading"><div><p className="kicker">{t('kicker')}</p><h1>{t(title)}</h1>{description&&<p>{t(description)}</p>}</div></div>{children}</main>
    </div>
    <button className="urgent-fab" onClick={()=>setCrisis(true)}><ShieldAlertIcon/>{t('urgentHelp')}</button><CrisisSheet open={crisis} onClose={()=>setCrisis(false)}/>
  </div>;
}
function ShieldAlertIcon(){return <span aria-hidden="true">!</span>}

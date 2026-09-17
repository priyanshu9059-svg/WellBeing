'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BriefcaseMedical, HeartHandshake, House, Leaf, MapPinned, Menu, MessageCircle, Settings, Shield, ShieldCheck, UserRound, X } from 'lucide-react';
import { CrisisSheet } from './crisis-sheet';
import { AuthGate } from './auth-gate';
import { PwaRegister } from './pwa-register';
import { brand } from '@/config/brand';
import { LanguageSelect, useLanguage } from '@/components/language-provider';
import type { TranslationKey } from '@/components/language-provider';
import { getServices } from '@/services';
import { isApiEnabled } from '@/lib/api';

const nav = [
  {href:'/support',labelKey:'supportHome',icon:HeartHandshake}, {href:'/wellbeing',labelKey:'wellbeing',icon:MessageCircle},
  {href:'/exercises',labelKey:'exercises',icon:Leaf},
  {href:'/consultancy',labelKey:'findCare',icon:MapPinned},
  {href:'/safety-plan',labelKey:'safetyPlan',icon:ShieldCheck}, {href:'/privacy',labelKey:'privacy',icon:Shield},
];

export function AppShell({children,title,description}:{children:React.ReactNode;title:TranslationKey;description?:TranslationKey}){
  const path=usePathname(); const [menu,setMenu]=useState(false); const [crisis,setCrisis]=useState(false);
  const [authChecked, setAuthChecked] = useState(false); const [userSignedIn, setUserSignedIn] = useState(false);
  const {t}=useLanguage();
  const professionalMode = path === '/professional';
  const protectedDashboard = ['/support','/exercises','/consultancy','/safety-plan','/privacy','/settings','/access-code','/organization-demo'].includes(path);
  useEffect(() => {
    let cancelled = false;
    if (!protectedDashboard) { setAuthChecked(true); return () => { cancelled = true; }; }
    if (!isApiEnabled()) { setAuthChecked(true); return () => { cancelled = true; }; }
    getServices().authentication.me().then((user) => {
      if (!cancelled) { setUserSignedIn(Boolean(user && !user.anonymous)); setAuthChecked(true); }
    }).catch(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, [path, protectedDashboard]);
  if (protectedDashboard && (!authChecked || !userSignedIn)) {
    return <div className="app-frame"><main className="app-main auth-gate-main"><AuthGate /></main></div>;
  }
  return <div className="app-frame"><PwaRegister/><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><Link href="/" className="brand"><span aria-hidden="true">✦</span>{brand.name}</Link><div className="header-tools"><Link href={professionalMode?'/login':'/professional'} className={`professional-header-link ${professionalMode?'active':''}`}>{professionalMode?<UserRound size={16}/>:<BriefcaseMedical size={16}/>}<span>{professionalMode?'User log in':t('forProfessionals')}</span></Link><LanguageSelect id="app-language"/><button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle menu">{menu?<X/>:<Menu/>}</button></div></header>
    <div className="app-grid"><aside className={`sidebar ${menu?'open':''}`}><nav aria-label="Support tools"><Link href="/" className="nav-item"><House size={19}/>{t('home')}</Link>{nav.map(item=><Link key={item.href} href={item.href} className={`nav-item ${path===item.href?'active':''}`} onClick={()=>setMenu(false)}><item.icon size={19}/>{t(item.labelKey as Parameters<typeof t>[0])}</Link>)}</nav><div className="side-bottom"><Link href="/settings" className="nav-item"><Settings size={19}/>{t('settings')}</Link><Link href="/trust" className="tiny-link">{t('trustLimitations')}</Link></div></aside>
      <main id="main-content" className="app-main"><div className="page-heading"><div><p className="kicker">{t('kicker')}</p><h1>{t(title)}</h1>{description&&<p>{t(description)}</p>}</div></div>{children}</main>
    </div>
    <button className="urgent-fab" onClick={()=>setCrisis(true)}><ShieldAlertIcon/>{t('urgentHelp')}</button><CrisisSheet open={crisis} onClose={()=>setCrisis(false)}/>
  </div>;
}
function ShieldAlertIcon(){return <span aria-hidden="true">!</span>}

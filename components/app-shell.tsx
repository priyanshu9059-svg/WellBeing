'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BookOpenText, BriefcaseMedical, HeartHandshake, House, Leaf, MapPinned, Menu, MessageCircle, MoonStar, Settings, Shield, ShieldCheck, Sparkles, X } from 'lucide-react';
import { CrisisSheet } from './crisis-sheet';
import { PwaRegister } from './pwa-register';
import { brand } from '@/config/brand';

const nav = [
  {href:'/support',label:'Support home',icon:HeartHandshake}, {href:'/chat',label:'Conversation',icon:MessageCircle},
  {href:'/mood',label:'Mood',icon:MoonStar}, {href:'/journal',label:'Journal',icon:BookOpenText},
  {href:'/exercises',label:'Exercises',icon:Leaf}, {href:'/wellbeing',label:'Wellbeing',icon:Sparkles},
  {href:'/consultancy',label:'Find care',icon:MapPinned},
  {href:'/safety-plan',label:'Safety plan',icon:ShieldCheck}, {href:'/privacy',label:'Privacy',icon:Shield},
];

export function AppShell({children,title,description}:{children:React.ReactNode;title:string;description?:string}){
  const path=usePathname(); const [menu,setMenu]=useState(false); const [crisis,setCrisis]=useState(false);
  return <div className="app-frame"><PwaRegister/><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><Link href="/" className="brand"><span aria-hidden="true">✦</span>{brand.name}</Link><div className="header-tools"><Link href="/professional" className={`professional-header-link ${path==='/professional'?'active':''}`}><BriefcaseMedical size={16}/><span>For professionals</span></Link><label className="sr-only" htmlFor="app-language">Language</label><select id="app-language" defaultValue="English"><option>English</option><option>हिन्दी</option><option>Hinglish</option></select><button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle menu">{menu?<X/>:<Menu/>}</button></div></header>
    <div className="app-grid"><aside className={`sidebar ${menu?'open':''}`}><nav aria-label="Support tools"><Link href="/" className="nav-item"><House size={19}/>Home</Link>{nav.map(item=><Link key={item.href} href={item.href} className={`nav-item ${path===item.href?'active':''}`} onClick={()=>setMenu(false)}><item.icon size={19}/>{item.label}</Link>)}</nav><div className="side-bottom"><Link href="/settings" className="nav-item"><Settings size={19}/>Settings</Link><Link href="/trust" className="tiny-link">Trust & limitations</Link></div></aside>
      <main id="main-content" className="app-main"><div className="page-heading"><div><p className="kicker">Wellbeing Support</p><h1>{title}</h1>{description&&<p>{description}</p>}</div></div>{children}</main>
    </div>
    <button className="urgent-fab" onClick={()=>setCrisis(true)}><ShieldAlertIcon/>Get urgent help</button><CrisisSheet open={crisis} onClose={()=>setCrisis(false)}/>
  </div>;
}
function ShieldAlertIcon(){return <span aria-hidden="true">!</span>}

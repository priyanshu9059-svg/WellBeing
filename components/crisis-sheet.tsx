'use client';
import Link from 'next/link';
import { Phone, ShieldAlert, UserRound, X } from 'lucide-react';
import { crisisResources } from '@/config/crisis-resources';

export function CrisisSheet({open,onClose}:{open:boolean;onClose:()=>void}){
  if(!open) return null;
  return <div className="sheet-backdrop" onMouseDown={onClose}><aside className="crisis-sheet" role="dialog" aria-modal="true" aria-labelledby="crisis-heading" onMouseDown={e=>e.stopPropagation()}>
    <div className="sheet-head"><div className="icon-orb crisis"><ShieldAlert size={22}/></div><button className="icon-button" onClick={onClose} aria-label="Close urgent help"><X/></button></div>
    <p className="kicker">Urgent support</p><h2 id="crisis-heading">Do you need urgent help right now?</h2>
    <p>This website cannot dispatch emergency help. It can help you reach verified services.</p>
    <div className="crisis-options">
      <a className="crisis-call" href={crisisResources.teleManas.href}><Phone size={19}/><span><b>Call {crisisResources.teleManas.name}</b><small>{crisisResources.teleManas.number}</small></span></a>
      <a className="crisis-call emergency" href={crisisResources.emergency.href}><Phone size={19}/><span><b>Call emergency services</b><small>{crisisResources.emergency.number}</small></span></a>
      <Link className="sheet-option" href="/crisis"><ShieldAlert size={18}/> View other crisis resources</Link>
      <button className="sheet-option" onClick={()=>alert('Prototype planning prompt: choose someone you trust and decide what you want to say. No message has been sent.')}><UserRound size={18}/> Contact someone I trust</button>
      <Link className="sheet-option" href="/safety-plan">Create or open my safety plan</Link>
      <Link className="sheet-option" href="/chat">Return to conversation</Link>
    </div>
    <p className="fine-print">No call, message, location, or notification is triggered automatically.</p>
  </aside></div>;
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpenText, Languages, Leaf, LockKeyhole, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { PwaRegister } from '@/components/pwa-register';
import { brand } from '@/config/brand';

const steps = [
  { title: 'How would you like to begin?', options: ['Type a message', 'Talk using my voice', 'I’m not sure yet'] },
  { title: 'What feels closest to what you’re experiencing?', options: ['I feel afraid or unsafe', 'I feel overwhelmed', 'I feel lonely', 'Something difficult happened', 'I’m having distressing thoughts', 'I mainly need someone to listen', 'I’m not sure'] },
  { title: 'Choose what feels private enough', options: ['Continue anonymously', 'Sign in later', 'Enter organization or campus code'] },
];

export default function Home() {
  const [step, setStep] = useState(-1);
  return (
    <main>
      <PwaRegister />
      <section className="hero" aria-labelledby="hero-title">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="brand"><span aria-hidden="true">✦</span> {brand.name}</Link>
          <div className="nav-actions">
            <label className="sr-only" htmlFor="language">Language</label>
            <select id="language" defaultValue="English"><option>English</option><option>हिन्दी</option><option>Hinglish</option></select>
            <Link href="/crisis" className="urgent-link">Get urgent help</Link>
          </div>
        </nav>
        <div className="sky-orb orb-one" aria-hidden="true" /><div className="sky-orb orb-two" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">A quiet place to begin</p>
          <h1 id="hero-title">You don’t have to face this moment alone.</h1>
          <p className="hero-copy">Talk, type, or simply take a moment. Support begins at your pace.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => setStep(0)}>Start Talking <span aria-hidden="true">→</span></button><Link href="/support" className="text-link">Explore support tools</Link></div>
          <p className="privacy-note"><span aria-hidden="true">◌</span> Anonymous by default · Your prototype data stays on this device</p>
        </div>
        <div className="landscape" aria-hidden="true"><i /><b /><span /></div>
        {step >= 0 && <div className="modal-backdrop" role="presentation"><section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <button className="close-button" onClick={() => setStep(-1)} aria-label="Close onboarding">×</button><p className="step-label">Step {step + 1} of 3 · optional</p><h2 id="onboarding-title">{steps[step].title}</h2>
          <div className="option-list">{steps[step].options.map((option) => step === 2 ? <Link key={option} className="option-button" href={option.includes('organization') ? '/access-code' : '/chat'}>{option}<span>→</span></Link> : <button key={option} className="option-button" onClick={() => setStep(step + 1)}>{option}<span>→</span></button>)}</div>
          <p className="modal-note">You can skip this and change your choices at any time.</p>
        </section></div>}
      </section>
      <section className="landing-content" aria-labelledby="how-title">
        <div className="landing-section-head"><p className="eyebrow">Support without pressure</p><h2 id="how-title">Begin wherever you are.</h2><p>There is no right order and no account required. Take one step, pause, or leave whenever you choose.</p></div>
        <div className="how-grid"><article><span>01</span><h3>Choose your pace</h3><p>Type, speak, explore a tool, or simply look around.</p></article><article><span>02</span><h3>Share what fits</h3><p>Answer optional prompts without giving your identity.</p></article><article><span>03</span><h3>Find a next step</h3><p>Receive a short, manageable suggestion—not a diagnosis.</p></article></div>
      </section>
      <section className="landing-feature-band"><div className="landing-section-head"><p className="eyebrow">Different moments need different support</p><h2>Quiet tools, ready when you are.</h2></div><div className="landing-features">
        <Link href="/chat"><MessageCircle/><h3>Text & voice conversations</h3><p>Talk with a calm local support simulation that listens one question at a time.</p><b>Start a conversation <ArrowRight/></b></Link>
        <Link href="/privacy"><LockKeyhole/><h3>Private & anonymous</h3><p>No account or identity disclosure. You control what is stored in this browser.</p><b>See privacy controls <ArrowRight/></b></Link>
        <Link href="/mood"><BookOpenText/><h3>Mood & journal tools</h3><p>Notice patterns and make space for thoughts without streaks or rewards.</p><b>Try a check-in <ArrowRight/></b></Link>
        <Link href="/exercises"><Leaf/><h3>Guided wellbeing exercises</h3><p>Breathing, grounding, reframing, rest, and one manageable next step.</p><b>Explore exercises <ArrowRight/></b></Link>
        <Link href="/safety-plan"><ShieldCheck/><h3>Safety & crisis support</h3><p>Prepare a personal safety plan and quickly reach verified resources.</p><b>Open safety tools <ArrowRight/></b></Link>
        <Link href="/about"><Languages/><h3>Cultural & language awareness</h3><p>Choose English, Hindi, or Hinglish in this prototype experience.</p><b>Learn about the approach <ArrowRight/></b></Link>
      </div></section>
      <section className="landing-trust"><div className="trust-visual" aria-hidden="true"><span>✦</span><i/><b/></div><div><p className="eyebrow">Clarity builds trust</p><h2>Supportive, not clinical.</h2><p>Wellbeing Support is a frontend prototype. It does not diagnose, prescribe medication, monitor you, contact a counsellor, or dispatch emergency help. Your local choices remain yours.</p><div className="landing-link-row"><Link href="/trust">Read trust & limitations <ArrowRight/></Link><Link href="/privacy">Visit privacy center <ArrowRight/></Link></div></div></section>
      <section className="landing-faq"><div><p className="eyebrow">Questions are welcome</p><h2>Clear answers, in plain language.</h2></div><div><details open><summary>Do I need to share my name?</summary><p>No. Anonymous mode is the default, and all identity fields stay empty unless you independently choose otherwise.</p></details><details><summary>Is this a therapist or diagnostic service?</summary><p>No. The conversation and wellbeing summaries are local, mocked, and non-diagnostic.</p></details><details><summary>Can it call emergency help automatically?</summary><p>No. You must clearly choose a phone link before your device starts a call.</p></details><Link className="text-link" href="/faq">See all frequently asked questions →</Link></div></section>
      <section className="landing-cta"><span><Sparkles/></span><p className="eyebrow">A small beginning is enough</p><h2>You can start with one sentence.</h2><p>Share only what feels manageable right now.</p><button className="primary-button" onClick={()=>{setStep(0);window.scrollTo({top:0,behavior:'smooth'})}}>Start Talking <ArrowRight/></button></section>
      <footer className="landing-footer"><Link href="/" className="brand"><span>✦</span>{brand.name}</Link><p>A frontend-only prototype. Not a replacement for professional or emergency care.</p><nav><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/trust">Limitations</Link><Link href="/faq">FAQ</Link></nav></footer>
      <Link href="/crisis" className="urgent-fab"><span>!</span>Get urgent help</Link>
    </main>
  );
}

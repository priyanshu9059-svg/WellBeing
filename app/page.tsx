'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpenText, BriefcaseMedical, Languages, Leaf, LockKeyhole, MapPinned, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { PwaRegister } from '@/components/pwa-register';
import { brand } from '@/config/brand';
import { LanguageSelect, useLanguage } from '@/components/language-provider';

const steps = [
  { title: 'How would you like to begin?', options: ['Type a message', 'Talk using my voice', 'I’m not sure yet'] },
  { title: 'What feels closest to what you’re experiencing?', options: ['I feel afraid or unsafe', 'I feel overwhelmed', 'I feel lonely', 'Something difficult happened', 'I’m having distressing thoughts', 'I mainly need someone to listen', 'I’m not sure'] },
  { title: 'Choose what feels private enough', options: ['Continue anonymously', 'Sign in later', 'Enter organization or campus code'] },
];

export default function Home() {
  const [step, setStep] = useState(-1);
  const { t } = useLanguage();
  return (
    <main>
      <PwaRegister />
      <section className="hero" aria-labelledby="hero-title">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="brand"><span aria-hidden="true">✦</span> {brand.name}</Link>
          <div className="nav-actions">
            <LanguageSelect id="language" />
            <Link href="/crisis" className="urgent-link">{t('urgentHelp')}</Link>
          </div>
        </nav>
        <div className="sky-orb orb-one" aria-hidden="true" /><div className="sky-orb orb-two" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <h1 id="hero-title">{t('heroTitle')}</h1>
          <p className="hero-copy">{t('heroCopy')}</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => setStep(0)}>{t('startTalking')} <span aria-hidden="true">→</span></button><Link href="/support" className="text-link">{t('exploreTools')}</Link></div>
          <p className="privacy-note"><span aria-hidden="true">◌</span> {t('privacyNote')}</p>
        </div>
        <div className="landscape" aria-hidden="true"><i /><b /><span /></div>
        {step >= 0 && <div className="modal-backdrop" role="presentation"><section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <button className="close-button" onClick={() => setStep(-1)} aria-label="Close onboarding">×</button><p className="step-label">Step {step + 1} of 3 · optional</p><h2 id="onboarding-title">{steps[step].title}</h2>
          <div className="option-list">{steps[step].options.map((option) => step === 2 ? <Link key={option} className="option-button" href={option.includes('organization') ? '/access-code' : '/chat'}>{option}<span>→</span></Link> : <button key={option} className="option-button" onClick={() => setStep(step + 1)}>{option}<span>→</span></button>)}</div>
          <p className="modal-note">You can skip this and change your choices at any time.</p>
        </section></div>}
      </section>
      <section className="landing-content" aria-labelledby="how-title">
        <div className="landing-section-head"><p className="eyebrow">{t('supportWithoutPressure')}</p><h2 id="how-title">{t('beginWhereYouAre')}</h2><p>{t('beginWhereCopy')}</p></div>
        <div className="how-grid"><article><span>01</span><h3>{t('choosePace')}</h3><p>{t('choosePaceCopy')}</p></article><article><span>02</span><h3>{t('shareFits')}</h3><p>{t('shareFitsCopy')}</p></article><article><span>03</span><h3>{t('nextStep')}</h3><p>{t('nextStepCopy')}</p></article></div>
      </section>
      <section className="landing-feature-band"><div className="landing-section-head"><p className="eyebrow">{t('differentMoments')}</p><h2>{t('quietTools')}</h2></div><div className="landing-features">
        <Link href="/chat"><MessageCircle/><h3>{t('textVoice')}</h3><p>{t('textVoiceCopy')}</p><b>{t('startConversation')} <ArrowRight/></b></Link>
        <Link href="/privacy"><LockKeyhole/><h3>{t('privateAnonymous')}</h3><p>{t('privateAnonymousCopy')}</p><b>{t('privacyControls')} <ArrowRight/></b></Link>
        <Link href="/mood"><BookOpenText/><h3>{t('moodJournalTools')}</h3><p>{t('moodJournalCopy')}</p><b>{t('tryCheckIn')} <ArrowRight/></b></Link>
        <Link href="/exercises"><Leaf/><h3>{t('guidedWellbeing')}</h3><p>{t('guidedWellbeingCopy')}</p><b>{t('exploreExercises')} <ArrowRight/></b></Link>
        <Link href="/safety-plan"><ShieldCheck/><h3>{t('safetyCrisis')}</h3><p>{t('safetyCrisisCopy')}</p><b>{t('openSafety')} <ArrowRight/></b></Link>
        <Link href="/consultancy"><MapPinned/><h3>{t('nearbyCare')}</h3><p>{t('nearbyCareCopy')}</p><b>{t('findCareNearby')} <ArrowRight/></b></Link>
        <Link href="/professional"><BriefcaseMedical/><h3>{t('professionalPortal')}</h3><p>{t('professionalPortalCopy')}</p><b>{t('openProfessional')} <ArrowRight/></b></Link>
        <Link href="/about"><Languages/><h3>{t('languageAwareness')}</h3><p>{t('languageAwarenessCopy')}</p><b>{t('learnApproach')} <ArrowRight/></b></Link>
      </div></section>
      <section className="landing-trust"><div className="trust-visual" aria-hidden="true"><span>✦</span><i/><b/></div><div><p className="eyebrow">{t('clarityTrust')}</p><h2>{t('supportiveNotClinical')}</h2><p>{t('trustCopy')}</p><div className="landing-link-row"><Link href="/trust">{t('readTrust')} <ArrowRight/></Link><Link href="/privacy">{t('visitPrivacy')} <ArrowRight/></Link></div></div></section>
      <section className="landing-faq"><div><p className="eyebrow">{t('questionsWelcome')}</p><h2>{t('plainAnswers')}</h2></div><div><details open><summary>{t('nameQuestion')}</summary><p>{t('nameAnswer')}</p></details><details><summary>{t('therapyQuestion')}</summary><p>{t('therapyAnswer')}</p></details><details><summary>{t('emergencyQuestion')}</summary><p>{t('emergencyAnswer')}</p></details><Link className="text-link" href="/faq">{t('seeFaq')} →</Link></div></section>
      <section className="landing-cta"><span><Sparkles/></span><p className="eyebrow">{t('smallBeginning')}</p><h2>{t('oneSentence')}</h2><p>{t('oneSentenceCopy')}</p><button className="primary-button" onClick={()=>{setStep(0);window.scrollTo({top:0,behavior:'smooth'})}}>{t('startTalking')} <ArrowRight/></button></section>
      <footer className="landing-footer"><Link href="/" className="brand"><span>✦</span>{brand.name}</Link><p>{t('footerCopy')}</p><nav><Link href="/about">{t('about')}</Link><Link href="/privacy">{t('privacy')}</Link><Link href="/trust">{t('limitations')}</Link><Link href="/faq">{t('faq')}</Link></nav></footer>
      <Link href="/crisis" className="urgent-fab"><span>!</span>{t('urgentHelp')}</Link>
    </main>
  );
}

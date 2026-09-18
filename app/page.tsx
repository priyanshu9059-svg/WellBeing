'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpenText, BriefcaseMedical, Languages, Leaf, LockKeyhole, MapPinned, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { PwaRegister } from '@/components/pwa-register';
import { brand } from '@/config/brand';
import { LanguageSelect, useLanguage } from '@/components/language-provider';

export default function Home() {
  const [step, setStep] = useState(-1);
  const { t, language } = useLanguage();
  const copy = landingCopy[language];
  const steps = copy.steps;
  return (
    <main>
      <PwaRegister />
      <section className="hero" aria-labelledby="hero-title">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="brand"><span aria-hidden="true">✦</span> {brand.name}</Link>
          <div className="nav-actions">
            <Link href="/crisis" className="sos-top-link"><span aria-hidden="true">!</span> SOS</Link>
            <LanguageSelect id="language" />
            <Link className="get-started-link" href="/support"><ArrowRight size={16}/> {copy.getStarted}</Link>
          </div>
        </nav>
        <div className="sky-orb orb-one" aria-hidden="true" /><div className="sky-orb orb-two" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <h1 id="hero-title">{t('heroTitle')}</h1>
          <p className="hero-copy">{t('heroCopy')}</p>
          <div className="hero-actions"><Link className="primary-button" href="/chat"><MessageCircle size={18}/> {t('startTalking')} <span aria-hidden="true">→</span></Link><Link className="secondary-button" href="/support"><ShieldCheck size={18}/> {copy.accessSupport}</Link><Link href="/support" className="text-link">{t('exploreTools')}</Link></div>
          <p className="privacy-note"><span aria-hidden="true">◌</span> {t('privacyNote')}</p>
        </div>
        <div className="landscape" aria-hidden="true"><i /><b /><span /></div>
        {step >= 0 && <div className="modal-backdrop" role="presentation"><section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <button className="close-button" onClick={() => setStep(-1)} aria-label={copy.close}>×</button><p className="step-label">{copy.stepLabel(step + 1)}</p><h2 id="onboarding-title">{steps[step].title}</h2>
          <div className="option-list">{steps[step].options.map((option) => step === 2 ? <Link key={option.label} className="option-button" href={option.href}>{option.label}<span>→</span></Link> : <button key={option.label} className="option-button" onClick={() => setStep(step + 1)}>{option.label}<span>→</span></button>)}</div>
          <p className="modal-note">{copy.modalNote}</p>
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
      <section className="landing-cta"><span><Sparkles/></span><p className="eyebrow">{t('smallBeginning')}</p><h2>{t('oneSentence')}</h2><p>{t('oneSentenceCopy')}</p><Link className="primary-button" href="/chat">{t('startTalking')} <ArrowRight/></Link></section>
      <footer className="landing-footer"><Link href="/" className="brand"><span>✦</span>{brand.name}</Link><p>{t('footerCopy')}</p><nav><Link href="/about">{t('about')}</Link><Link href="/privacy">{t('privacy')}</Link><Link href="/trust">{t('limitations')}</Link><Link href="/faq">{t('faq')}</Link></nav></footer>
      <Link href="/crisis" className="urgent-fab"><span>!</span>{t('urgentHelp')}</Link>
    </main>
  );
}

const landingCopy = {
  English: {
    getStarted: 'Get Started',
    accessSupport: 'Open support tools',
    close: 'Close onboarding',
    modalNote: 'You can skip this and change your choices at any time.',
    stepLabel: (step: number) => `Step ${step} of 3 · optional`,
    steps: [
      { title: 'How would you like to begin?', options: [{ label: 'Type a message' }, { label: 'Talk using my voice' }, { label: 'I’m not sure yet' }] },
      { title: 'What feels closest to what you’re experiencing?', options: [{ label: 'I feel afraid or unsafe' }, { label: 'I feel overwhelmed' }, { label: 'I feel lonely' }, { label: 'Something difficult happened' }, { label: 'I’m having distressing thoughts' }, { label: 'I mainly need someone to listen' }, { label: 'I’m not sure' }] },
      { title: 'Choose what feels private enough', options: [{ label: 'Continue anonymously', href: '/chat' }, { label: 'Open support tools', href: '/support' }, { label: 'Enter organization or campus code', href: '/access-code' }] },
    ],
  },
  Hindi: {
    getStarted: 'शुरू करें',
    accessSupport: 'Support tools खोलें',
    close: 'ऑनबोर्डिंग बंद करें',
    modalNote: 'आप इसे छोड़ सकते हैं और अपनी पसंद कभी भी बदल सकते हैं।',
    stepLabel: (step: number) => `चरण ${step} / 3 · वैकल्पिक`,
    steps: [
      { title: 'आप कैसे शुरू करना चाहेंगे?', options: [{ label: 'Message type करें' }, { label: 'Voice से बात करें' }, { label: 'अभी पक्का नहीं' }] },
      { title: 'आपके अनुभव के सबसे करीब क्या है?', options: [{ label: 'मुझे डर या unsafe महसूस हो रहा है' }, { label: 'मैं overwhelmed महसूस कर रहा/रही हूं' }, { label: 'मैं अकेला/अकेली महसूस कर रहा/रही हूं' }, { label: 'कुछ मुश्किल हुआ है' }, { label: 'Distressing thoughts आ रहे हैं' }, { label: 'मुझे बस कोई सुनने वाला चाहिए' }, { label: 'अभी पक्का नहीं' }] },
      { title: 'जो private लगे वह चुनें', options: [{ label: 'Anonymous जारी रखें', href: '/chat' }, { label: 'Support tools खोलें', href: '/support' }, { label: 'Organization या campus code डालें', href: '/access-code' }] },
    ],
  },
  Hinglish: {
    getStarted: 'Get Started',
    accessSupport: 'Support tools kholo',
    close: 'Onboarding close karo',
    modalNote: 'Ye skip kar sakte ho aur choices kabhi bhi change kar sakte ho.',
    stepLabel: (step: number) => `Step ${step} of 3 · optional`,
    steps: [
      { title: 'Kaise begin karna chahoge?', options: [{ label: 'Message type karo' }, { label: 'Voice se baat karo' }, { label: 'Abhi sure nahi' }] },
      { title: 'Jo feel ho raha hai uske closest kya hai?', options: [{ label: 'Mujhe afraid ya unsafe feel ho raha hai' }, { label: 'Main overwhelmed feel kar raha/rahi hoon' }, { label: 'Main lonely feel kar raha/rahi hoon' }, { label: 'Kuch difficult hua hai' }, { label: 'Distressing thoughts aa rahe hain' }, { label: 'Mujhe mainly koi sunne wala chahiye' }, { label: 'Abhi sure nahi' }] },
      { title: 'Jo private enough lage woh choose karo', options: [{ label: 'Anonymously continue karo', href: '/chat' }, { label: 'Support tools kholo', href: '/support' }, { label: 'Organization ya campus code enter karo', href: '/access-code' }] },
    ],
  },
};

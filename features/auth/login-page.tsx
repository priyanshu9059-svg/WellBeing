'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';

const copy = {
  English: {
    tabs: ['Log in', 'Sign up'],
    kicker: ['Welcome back', 'Create your private account'],
    title: ['Continue to your support space', 'Start with a private account'],
    name: 'Full name',
    email: 'Email or mobile number',
    password: 'Password',
    consent: 'Keep my account private by default',
    consentCopy: 'You can choose what to share after sign up.',
    submit: ['Log in', 'Sign up'],
    anonymous: 'Continue anonymously instead',
    note: 'After sign up, we can ask optional onboarding prompts and personalize the experience in your preferred language.',
  },
  Hindi: {
    tabs: ['Log in', 'Sign up'],
    kicker: ['वापस स्वागत है', 'Private account बनाएं'],
    title: ['अपने support space में जारी रखें', 'Private account से शुरू करें'],
    name: 'पूरा नाम',
    email: 'Email या mobile number',
    password: 'Password',
    consent: 'Account default रूप से private रखें',
    consentCopy: 'Sign up के बाद आप चुन सकते हैं कि क्या share करना है।',
    submit: ['Log in', 'Sign up'],
    anonymous: 'Anonymous जारी रखें',
    note: 'Sign up के बाद optional onboarding prompts आ सकते हैं और experience आपकी चुनी भाषा में personalize होगा।',
  },
  Hinglish: {
    tabs: ['Log in', 'Sign up'],
    kicker: ['Welcome back', 'Private account banao'],
    title: ['Apne support space mein continue karo', 'Private account se start karo'],
    name: 'Full name',
    email: 'Email ya mobile number',
    password: 'Password',
    consent: 'Account default private rakho',
    consentCopy: 'Sign up ke baad aap choose kar sakte ho kya share karna hai.',
    submit: ['Log in', 'Sign up'],
    anonymous: 'Anonymous continue karo',
    note: 'Sign up ke baad optional onboarding prompts aa sakte hain aur experience preferred language mein personalize hoga.',
  },
};

export function LoginPage() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const text = copy[language];
  const index = mode === 'login' ? 0 : 1;

  return (
    <div className="login-page">
      <Card className="auth-card account-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{text.tabs[0]}</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>{text.tabs[1]}</button>
        </div>
        <p className="kicker">{text.kicker[index]}</p>
        <h2>{text.title[index]}</h2>
        {mode === 'signup' && <label className="field"><span>{text.name}</span><span className="input-icon"><UserRound/><input autoComplete="name" /></span></label>}
        <label className="field"><span>{text.email}</span><span className="input-icon"><Mail/><input autoComplete="email" /></span></label>
        <label className="field"><span>{text.password}</span><span className="input-icon"><LockKeyhole/><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></span></label>
        {mode === 'signup' && <label className="check"><input type="checkbox" defaultChecked/><span><b>{text.consent}</b><small>{text.consentCopy}</small></span></label>}
        <Button className="auth-submit">{text.submit[index]} <ArrowRight/></Button>
        <Link className="text-link account-anonymous" href="/chat">{text.anonymous}</Link>
        <p className="fine-print">{text.note}</p>
      </Card>
    </div>
  );
}

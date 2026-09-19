'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { getServices } from '@/services';
import { createLocalUser, DEMO_ACCOUNTS, ensureLocalDemoAccounts, signInLocalUser } from '@/lib/local-user-auth';

function apiConfigured() {
  return Boolean((process.env.NEXT_PUBLIC_API_BASE_URL || '').trim());
}

function isDemoLogin(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized === DEMO_ACCOUNTS.user.email || normalized === DEMO_ACCOUNTS.counsellor.email;
}

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
    note: 'After sign up you can add optional details (location, ABHA ID, phone, gender, age) or skip them.',
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
    note: 'Sign up के बाद optional details (location, ABHA ID, phone, gender, age) जोड़ सकते हैं या छोड़ सकते हैं।',
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
    note: 'Sign up ke baad optional details (location, ABHA ID, phone, gender, age) add kar sakte ho ya skip kar sakte ho.',
  },
};

export function LoginPage({ defaultMode = 'login' }: { defaultMode?: 'login' | 'signup' }) {
  const { language } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState(defaultMode === 'login' ? DEMO_ACCOUNTS.user.email : '');
  const [password, setPassword] = useState(defaultMode === 'login' ? DEMO_ACCOUNTS.user.password : '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const text = copy[language];
  const index = mode === 'login' ? 0 : 1;

  useEffect(() => {
    void ensureLocalDemoAccounts();
  }, []);

  function fillDemo(kind: 'user' | 'counsellor') {
    const account = DEMO_ACCOUNTS[kind];
    setMode('login');
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  return (
    <div className="login-page">
      <Card className="auth-card account-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{text.tabs[0]}</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>{text.tabs[1]}</button>
        </div>
        <p className="kicker">{text.kicker[index]}</p>
        <h2>{text.title[index]}</h2>
        {mode === 'signup' && (
          <label className="field">
            <span>{text.name}</span>
            <span className="input-icon">
              <UserRound />
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </span>
          </label>
        )}
        <label className="field">
          <span>{text.email}</span>
          <span className="input-icon">
            <Mail />
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </span>
        </label>
        <label className="field">
          <span>{text.password}</span>
          <span className="input-icon">
            <LockKeyhole />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </span>
        </label>
        {mode === 'signup' && (
          <label className="check">
            <input type="checkbox" defaultChecked />
            <span>
              <b>{text.consent}</b>
              <small>{text.consentCopy}</small>
            </span>
          </label>
        )}
        <Button
          className="auth-submit"
          disabled={busy}
          onClick={async () => {
            setError('');
            if (mode === 'signup' && name.trim().length < 2) {
              setError('Please enter your name (at least 2 characters).');
              return;
            }
            if (!(mode === 'login' && isDemoLogin(email)) && password.length < 8) {
              setError('Password must be at least 8 characters.');
              return;
            }
            setBusy(true);
            try {
              const useApi = apiConfigured();
              if (mode === 'login') {
                if (useApi) {
                  const result = await getServices().authentication.signIn(email.trim(), password);
                  if (['COUNSELLOR', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'ORG_ADMIN'].includes(result.user.role)) {
                    router.push('/professional');
                  } else {
                    router.push('/support');
                  }
                } else {
                  await signInLocalUser(email.trim(), password);
                  if (email.trim().toLowerCase() === DEMO_ACCOUNTS.counsellor.email) {
                    router.push('/professional');
                  } else {
                    router.push('/support');
                  }
                }
              } else if (useApi) {
                const result = await getServices().authentication.signUp({
                  email: email.trim(),
                  password,
                  displayName: name.trim(),
                  role: 'USER',
                });
                router.push(result.needsProfile !== false ? '/complete-profile' : '/support');
              } else {
                await createLocalUser({
                  displayName: name.trim(),
                  identifier: email.trim(),
                  password,
                });
                router.push('/complete-profile');
              }
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Unable to continue.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Please wait…' : text.submit[index]} <ArrowRight />
        </Button>
        {error && <p className="error-text">{error}</p>}
        <div className="demo-account-box">
          <p className="kicker">Demo accounts</p>
          <p className="fine-print" style={{ marginBottom: 10 }}>
            Password for both: <b>prototype</b>
          </p>
          <div className="demo-account-cards">
            <button type="button" className="demo-account-card" onClick={() => fillDemo('user')}>
              <b>User</b>
              <span>{DEMO_ACCOUNTS.user.email}</span>
              <small>Fills login · opens support tools</small>
            </button>
            <button type="button" className="demo-account-card" onClick={() => fillDemo('counsellor')}>
              <b>Counsellor</b>
              <span>{DEMO_ACCOUNTS.counsellor.email}</span>
              <small>Fills login · use Professional portal</small>
            </button>
          </div>
        </div>
        <Link className="text-link" href="/crisis">
          Need urgent help without logging in?
        </Link>
        <p className="fine-print">{text.note}</p>
      </Card>
    </div>
  );
}

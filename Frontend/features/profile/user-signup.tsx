'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isApiEnabled } from '@/lib/api';
import { getServices } from '@/services';

export function UserSignup() {
  const router = useRouter();
  const services = getServices();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!displayName.trim() || !email.trim() || password.length < 8) {
      setError('Please enter your name, email, and a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (isApiEnabled()) {
        await services.authentication.signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role: 'USER',
        });
      } else {
        localStorage.setItem(
          'wellbeing-support:local-account',
          JSON.stringify({ email, displayName }),
        );
      }
      router.push('/complete-profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow-page">
      <Card className="access-card">
        <div className="icon-orb">
          <UserRound />
        </div>
        <p className="kicker">Create your account</p>
        <h2>A private place to continue your support</h2>
        <p>Sign up to sync your tools across sessions. You can stay anonymous in chat and skip optional details next.</p>
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we greet you?" />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="row">
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create account'} <ChevronRight />
          </Button>
          <Link className="btn btn-ghost" href="/chat">
            Continue anonymously
          </Link>
        </div>
        <div className="privacy-box">
          <LockKeyhole />
          <p>
            <b>Optional details come next</b>
            <br />
            Location, ABHA ID, phone, gender, and age are skippable and editable later from Settings.
          </p>
        </div>
      </Card>
    </div>
  );
}

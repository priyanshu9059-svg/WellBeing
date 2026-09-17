'use client';

import Link from 'next/link';
import { LogIn, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AuthGate() {
  return (
    <div className="auth-gate">
      <Card>
        <div className="auth-gate-icon"><ShieldCheck /></div>
        <p className="kicker">Private support space</p>
        <h2>Log in to continue</h2>
        <p>Your support dashboard, conversations, journal, and wellbeing records are available after you sign in.</p>
        <Link className="btn btn-primary" href="/login"><LogIn size={17} /> Log in or sign up</Link>
        <small>Your urgent-help resources remain available without an account.</small>
      </Card>
    </div>
  );
}

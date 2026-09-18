'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AuthGate() {
  return (
    <div className="auth-gate">
      <Card>
        <div className="auth-gate-icon"><ShieldCheck /></div>
        <p className="kicker">Private support space</p>
        <h2>Support is open</h2>
        <p>Your support dashboard, conversations, journal, and wellbeing tools are available without an account.</p>
        <Link className="btn btn-primary" href="/support"><ArrowRight size={17} /> Open support tools</Link>
        <small>No login or signup is required.</small>
      </Card>
    </div>
  );
}

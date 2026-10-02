'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Mail, MessageSquareText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ensureSession, isApiEnabled } from '@/lib/api';
import { getServices, type CareMessageDto } from '@/services';

export function CareMessagesPage() {
  const services = getServices();
  const [items, setItems] = useState<CareMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled() || !services.care.listCareMessages) {
        setError('Connect the API and sign in to see counsellor messages.');
        setLoading(false);
        return;
      }
      try {
        await ensureSession();
        const data = await services.care.listCareMessages();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError('Could not load care messages. Sign in with your patient account and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="narrow-page">
        <Card><p className="kicker">Care messages</p><h2>Loading…</h2></Card>
      </div>
    );
  }

  return (
    <div className="narrow-page">
      <Card className="access-card">
        <p className="kicker">From your counsellor</p>
        <h2>Care messages</h2>
        <p>Messages and scheduled calls from your care team appear here. Email copies are sent when your profile has an email address.</p>
        {error && <p className="error-text">{error}</p>}
        {!error && items.length === 0 && (
          <p className="muted">No counsellor messages yet. When a counsellor writes or schedules a call, it will show up here.</p>
        )}
        <div className="care-message-list">
          {items.map((item) => (
            <article key={item.id} className={`care-message-card ${item.kind}`}>
              <div className="care-message-head">
                <span className="soft-icon">{item.kind === 'schedule' ? <CalendarDays /> : <MessageSquareText />}</span>
                <div>
                  <b>{item.clinicianName}</b>
                  <small>{new Date(item.createdAt).toLocaleString()} · {item.kind === 'schedule' ? 'Scheduled call' : 'Message'}</small>
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{item.body}</p>
              {item.kind === 'schedule' && (
                <p className="fine-print"><Mail size={14} /> Also listed under History / appointments</p>
              )}
            </article>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
          <Link href="/history" className="btn btn-secondary">Open history</Link>
          <Link href="/profile" className="btn btn-ghost">Profile & email</Link>
        </div>
      </Card>
    </div>
  );
}

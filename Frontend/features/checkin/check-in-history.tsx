'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ClipboardList, Mic, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getServices, type TimelineItem } from '@/services';
import { getToken, isApiEnabled } from '@/lib/api';

export function CheckInHistory() {
  const services = getServices();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        setError('Connect the API to load your history.');
        setLoading(false);
        return;
      }
      try {
        const data = await services.checkIns.timeline();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError('Could not load history. Sign in and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function playVoice(id: string) {
    const token = getToken();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    setPlayingId(id);
    try {
      const res = await fetch(`${base}/api/checkins/${id}/voice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('unavailable');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingId(null);
      };
      await audio.play();
    } catch {
      setPlayingId(null);
      setError('Voice playback unavailable.');
    }
  }

  return (
    <div className="history-page">
      <Card className="history-intro">
        <p className="kicker">Your care timeline</p>
        <h2>Check-ins and appointments</h2>
        <p>Notes and voice you submit, plus meetings scheduled with a counsellor, appear here in one place.</p>
        <Link className="btn btn-primary" href="/check-in">New check-in</Link>
      </Card>

      {loading && <p>Loading timeline…</p>}
      {error && <p className="checkin-error" role="alert">{error}</p>}

      <div className="history-timeline">
        {items.map((item) => {
          if (item.kind === 'appointment') {
            const a = item.appointment!;
            return (
              <Card key={`a-${a.id}`} className="history-item">
                <div className="history-item-head">
                  <CalendarDays size={18} />
                  <div>
                    <b>Appointment · {a.status}</b>
                    <small>{new Date(item.at).toLocaleString()}</small>
                  </div>
                </div>
                <p>{a.place}{a.clinician ? ` · ${a.clinician}` : ''}</p>
                <p>{a.date} · {a.time} · {a.mode}</p>
              </Card>
            );
          }
          const c = item.checkIn!;
          return (
            <Card key={`c-${c.id}`} className="history-item">
              <div className="history-item-head">
                <ClipboardList size={18} />
                <div>
                  <b>Check-in · {c.themeLabel || c.theme}</b>
                  <small>{new Date(item.at).toLocaleString()}</small>
                </div>
                {c.priority && <span className={`priority-pill priority-${(c.priority || '').toLowerCase()}`}>{c.priority}</span>}
              </div>
              {c.text && <p>{c.text}</p>}
              <div className="checkin-scores compact">
                <div><span>Distress</span><b>{c.distress ?? '—'}</b></div>
                <div><span>Safety</span><b>{c.safetyRisk != null ? Math.round(c.safetyRisk) : '—'}</b></div>
                <div><span>Escalation</span><b>{c.escalationRisk ?? '—'}</b></div>
                <div><span>Sentiment</span><b>{c.sentimentLabel ?? '—'}</b></div>
              </div>
              {c.hasVoice && (
                <Button variant="secondary" onClick={() => void playVoice(c.id)} disabled={playingId === c.id}>
                  {playingId === c.id ? <Mic size={14} /> : <Play size={14} />}
                  {playingId === c.id ? 'Playing…' : 'Play voice'}
                </Button>
              )}
            </Card>
          );
        })}
        {!loading && !items.length && !error && (
          <Card><p>No check-ins or appointments yet. Start with a <Link href="/check-in">check-in</Link> or book care.</p></Card>
        )}
      </div>
    </div>
  );
}

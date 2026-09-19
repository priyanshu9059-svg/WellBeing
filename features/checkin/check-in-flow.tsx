'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, Square, Send, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getServices, type CheckInDto, type CheckInTheme } from '@/services';
import { createWavRecorder } from '@/lib/wav-recorder';
import { isApiEnabled } from '@/lib/api';

export function CheckInFlow() {
  const services = getServices();
  const [themes, setThemes] = useState<CheckInTheme[]>([]);
  const [theme, setTheme] = useState('general_wellbeing');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInDto | null>(null);
  const recorderRef = useRef(createWavRecorder());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await services.checkIns.themes();
        if (!cancelled) {
          setThemes(list);
          if (list[0]) setTheme(list[0].id);
        }
      } catch {
        if (!cancelled) {
          setThemes([
            { id: 'threats_intimidation', label: 'Threats / intimidation' },
            { id: 'court_legal_stress', label: 'Court / legal stress' },
            { id: 'investigation_delays', label: 'Investigation or trial delays' },
            { id: 'social_ostracism', label: 'Social ostracism / isolation' },
            { id: 'economic_hardship', label: 'Economic hardship' },
            { id: 'rehabilitation_housing', label: 'Rehabilitation / housing' },
            { id: 'sleep_daily', label: 'Sleep / daily functioning' },
            { id: 'family_safety', label: 'Family safety' },
            { id: 'counselling_support', label: 'Counselling / psychological support' },
            { id: 'general_wellbeing', label: 'General wellbeing' },
          ]);
        }
      }
    })();
    return () => {
      cancelled = true;
      recorderRef.current.discard();
    };
  }, []);

  async function toggleRecord() {
    setError(null);
    if (recording) {
      try {
        const blob = await recorderRef.current.stop();
        setWavBlob(blob);
        setRecording(false);
      } catch {
        setError('Could not finish recording.');
        setRecording(false);
      }
      return;
    }
    try {
      setWavBlob(null);
      await recorderRef.current.start();
      setRecording(true);
    } catch {
      setError('Microphone permission is needed for voice check-in.');
    }
  }

  async function submit() {
    const clean = text.trim();
    if (!clean) {
      setError('Please write a short note about how you are feeling.');
      return;
    }
    if (!isApiEnabled()) {
      setError('Connect the API (NEXT_PUBLIC_API_BASE_URL) to save check-ins.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let created = await services.checkIns.create({ theme, text: clean });
      if (wavBlob) {
        created = await services.checkIns.uploadVoice(created.id, wavBlob);
      }
      setResult(created);
      setText('');
      setWavBlob(null);
    } catch (e) {
      setError((e as Error).message || 'Could not submit check-in.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="checkin-page">
        <Card className="checkin-card">
          <p className="kicker">Check-in saved</p>
          <h2>Thank you for sharing.</h2>
          <p>Your note was assessed by the wellbeing model. A counsellor can review consented signals on their dashboard.</p>
          <div className="checkin-scores">
            <div><span>Priority</span><b>{result.priority ?? '—'}</b></div>
            <div><span>Distress</span><b>{result.distress ?? '—'}</b></div>
            <div><span>Safety</span><b>{result.safetyRisk != null ? Math.round(result.safetyRisk) : '—'}</b></div>
            <div><span>Escalation</span><b>{result.escalationRisk ?? '—'}</b></div>
            <div><span>Sentiment</span><b>{result.sentimentLabel ?? '—'}</b></div>
            <div><span>Voice stress</span><b>{result.stressScore != null ? result.stressScore.toFixed(2) : '—'}</b></div>
          </div>
          {result.factors?.length ? (
            <p className="checkin-factors">Factors: {result.factors.join(', ')}</p>
          ) : null}
          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <Button onClick={() => setResult(null)}>New check-in</Button>
            <Link className="btn btn-secondary" href="/history"><History size={16} /> Open history</Link>
          </div>
          <small className="composer-note">Prototype ML estimates — not a clinical diagnosis. Human review required.</small>
        </Card>
      </div>
    );
  }

  return (
    <div className="checkin-page">
      <Card className="checkin-card">
        <p className="kicker">Wellbeing check-in</p>
        <h2>Share what’s weighing on you</h2>
        <p>
          Victims of atrocities often face ongoing distress after complaint registration — threats, court delays,
          ostracism, economic pressure, and rehabilitation challenges. This check-in helps monitor wellbeing
          between legal and financial support.
        </p>

        <label className="checkin-label" htmlFor="checkin-theme">What kind of support theme fits best?</label>
        <select id="checkin-theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="checkin-select">
          {(themes.length
            ? themes
            : [{ id: 'general_wellbeing', label: 'General wellbeing' }]
          ).map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <label className="checkin-label" htmlFor="checkin-text">Your note</label>
        <textarea
          id="checkin-text"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write in English, Hindi, or Hinglish — threats, sleep, court stress, isolation, money worry…"
          className="checkin-textarea"
        />

        <div className="checkin-voice">
          <Button variant="secondary" onClick={() => void toggleRecord()} disabled={submitting}>
            {recording ? <><Square size={16} /> Stop recording</> : <><Mic size={16} /> Record voice (WAV)</>}
          </Button>
          {wavBlob && <span className="checkin-voice-ready">Voice attached ({Math.round(wavBlob.size / 1024)} KB)</span>}
          {recording && <span className="checkin-recording">Recording…</span>}
        </div>

        {error && <p className="checkin-error" role="alert">{error}</p>}

        <Button onClick={() => void submit()} disabled={submitting || recording}>
          <Send size={16} /> {submitting ? 'Assessing…' : 'Submit check-in'}
        </Button>
        <small className="composer-note">Separate from the AI companion chat. Scores are stored for your history and consented counsellor review.</small>
      </Card>
    </div>
  );
}

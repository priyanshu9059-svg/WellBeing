'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, Square, Send, History, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeResolutionPanel } from '@/components/theme-resolution-panel';
import { useLanguage } from '@/components/language-provider';
import { getServices, type CheckInDto, type CheckInTheme } from '@/services';
import { createWavRecorder } from '@/lib/wav-recorder';
import { isApiEnabled } from '@/lib/api';
import { isBrowserSpeechSupported, pickBestTranscript, startBrowserSpeech } from '@/lib/browser-speech';
import { ATROCITY_DIRECT_HELPLINES } from '@/config/theme-resolutions';

export function CheckInFlow() {
  const services = getServices();
  const { language } = useLanguage();
  const [themes, setThemes] = useState<CheckInTheme[]>([]);
  const [theme, setTheme] = useState('general_wellbeing');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<CheckInDto | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recorderRef = useRef(createWavRecorder());
  const speechRef = useRef<ReturnType<typeof startBrowserSpeech> | null>(null);

  const speechLang = language === 'Hindi' ? 'hi-IN' : 'en-IN';

  useEffect(() => {
    setSpeechSupported(isBrowserSpeechSupported());
  }, []);

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
      void speechRef.current?.stop();
    };
  }, []);

  async function toggleRecord() {
    setError(null);
    setStatus('');
    if (recording) {
      setTranscribing(true);
      try {
        const blob = await recorderRef.current.stop();
        setWavBlob(blob);
        setRecording(false);
        const browserText = (await speechRef.current?.stop()) || '';
        speechRef.current = null;
        let apiText = '';
        if (isApiEnabled() && services.voiceTranscription?.transcribe) {
          try {
            apiText = await services.voiceTranscription.transcribe(blob);
          } catch {
            apiText = '';
          }
        }
        const transcript = pickBestTranscript(apiText, browserText, text);
        if (transcript) {
          setText(transcript);
          setStatus(
            apiText?.trim()
              ? 'Voice transcribed into your note.'
              : browserText
                ? 'Browser speech transcribed into your note.'
                : 'Note ready.',
          );
        } else {
          setStatus('Voice attached. Add or edit the note text, then submit.');
        }
      } catch {
        setError('Could not finish recording.');
        setRecording(false);
        speechRef.current = null;
      } finally {
        setTranscribing(false);
      }
      return;
    }
    try {
      setWavBlob(null);
      // Own the mic with the WAV recorder first, then attach live speech.
      await recorderRef.current.start();
      setRecording(true);
      speechRef.current = startBrowserSpeech(speechLang, (live) => {
        if (live) setText(live);
      });
      setStatus(
        speechSupported
          ? 'Listening… speak clearly. Your words appear in the note as you talk.'
          : 'Recording… add a typed note if auto-transcript is unavailable in this browser.',
      );
    } catch (e) {
      speechRef.current = null;
      recorderRef.current.discard();
      setRecording(false);
      const msg = (e as Error)?.message || '';
      setError(
        /Permission|NotAllowed|denied/i.test(msg)
          ? 'Microphone permission is needed for voice check-in.'
          : 'Could not start voice recording. Check microphone access and try Chrome or Edge.',
      );
    }
  }

  async function submit() {
    const clean = text.trim();
    if (!clean && !wavBlob) {
      setError('Write a short note or record your voice first.');
      return;
    }
    if (!clean) {
      setError('Add a short note (or wait for voice transcription) before submitting.');
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
      setStatus('');
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
          <p>
            Your note was assessed for distress linked to the case lifecycle. A counsellor can review consented
            signals — and you can take direct next steps for this theme below.
          </p>
          {result.transcript || result.text ? (
            <p className="checkin-transcript"><b>Note:</b> {result.transcript || result.text}</p>
          ) : null}
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
          <ThemeResolutionPanel themeId={result.theme || theme} title="Next steps for your selected theme" />
          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <Button onClick={() => setResult(null)}>New check-in</Button>
            <Link className="btn btn-secondary" href="/history"><History size={16} /> Open history</Link>
            <Link className="btn btn-secondary" href="/crisis">All helplines</Link>
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

        <div className="checkin-direct-help">
          <p className="kicker">Direct help right now</p>
          <div className="theme-helpline-row">
            {ATROCITY_DIRECT_HELPLINES.slice(0, 4).map((line) => (
              <a key={line.number} className="theme-call" href={line.href}>
                <Phone size={16} />
                <span>
                  <b>{line.name}</b>
                  <small>{line.number}{line.note ? ` · ${line.note}` : ''}</small>
                </span>
              </a>
            ))}
          </div>
        </div>

        <ThemeResolutionPanel themeId={theme} compact title="Resolution paths for this theme" />

        <label className="checkin-label" htmlFor="checkin-text">Your note (typed or from voice)</label>
        <textarea
          id="checkin-text"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Speak with Record voice, or write in English, Hindi, or Hinglish…"
          className="checkin-textarea"
        />

        <div className="checkin-voice">
          <Button variant="secondary" onClick={() => void toggleRecord()} disabled={submitting || transcribing}>
            {recording ? <><Square size={16} /> Stop &amp; transcribe</> : <><Mic size={16} /> Record voice</>}
          </Button>
          {wavBlob && <span className="checkin-voice-ready">Voice attached ({Math.round(wavBlob.size / 1024)} KB)</span>}
          {recording && <span className="checkin-recording">Recording…</span>}
          {transcribing && <span className="checkin-recording">Transcribing…</span>}
        </div>

        {status && <p className="success-text" role="status">{status}</p>}
        {error && <p className="checkin-error" role="alert">{error}</p>}

        <Button onClick={() => void submit()} disabled={submitting || recording || transcribing}>
          <Send size={16} /> {submitting ? 'Assessing…' : 'Submit check-in'}
        </Button>
        <small className="composer-note">
          Voice is transcribed into the note above, then scored. Separate from the AI companion chat.
          {speechSupported ? ' Live browser speech is available in this browser.' : ' For live speech, use Chrome or Edge.'}
        </small>
      </Card>
    </div>
  );
}

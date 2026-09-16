'use client';
/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronRight, Shield, Sparkles, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockSnapshot } from '@/mocks/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { isApiEnabled } from '@/lib/api';
import { getServices } from '@/services';
import { features } from '@/config/features';
import type { ContactConsent, Level, WellbeingSnapshot } from '@/types';

const questions = [
  { q: 'How intense has the distress felt recently?', a: ['Low', 'Moderate', 'Elevated', 'High'] },
  { q: 'How supported do you feel by people around you?', a: ['Well supported', 'Some support', 'Very little support', 'Unsure'] },
  { q: 'How has sleep been affected?', a: ['Not affected', 'A little', 'Quite a lot', 'Severely'] },
];

export function WellbeingAnalysis() {
  const services = getServices();
  const [phase, setPhase] = useState<'questions' | 'camera' | 'analyzing' | 'result'>('questions');
  const [answers, setAnswers] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [snapshot, setSnapshot] = useState<WellbeingSnapshot>(mockSnapshot);

  function choose(a: string) {
    const next = [...answers, a];
    setAnswers(next);
    if (next.length === questions.length) setPhase('camera');
  }

  useEffect(() => {
    if (phase !== 'analyzing') return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        if (isApiEnabled()) {
          const remote = await services.wellbeingAnalysis.analyze({ answers });
          if (!cancelled) setSnapshot(remote);
        }
      } catch {
        /* keep mock */
      }
      if (cancelled) return;
      intervalId = setInterval(() => {
        setProgress((p) => {
          if (p >= 3) {
            if (intervalId) clearInterval(intervalId);
            setTimeout(() => {
              if (!cancelled) setPhase('result');
            }, 400);
            return p;
          }
          return p + 1;
        });
      }, 850);
    })();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [phase]);

  return (
    <>
      {phase === 'questions' && (
        <Card className="analysis-card">
          <p className="kicker">Optional adaptive check-in</p>
          <h2>{questions[answers.length].q}</h2>
          <p>Choose the closest answer. This is not a clinical questionnaire.</p>
          <div className="answer-list">
            {questions[answers.length].a.map((a) => (
              <button key={a} onClick={() => choose(a)}>
                {a}
                <ChevronRight />
              </button>
            ))}
          </div>
          <small>
            Question {answers.length + 1} of {questions.length}
          </small>
        </Card>
      )}
      {phase === 'camera' && <CameraCheck onContinue={() => setPhase('analyzing')} />}
      {phase === 'analyzing' && (
        <Card className="analysis-progress">
          <div className="analysis-orb">
            <Sparkles />
          </div>
          <h2>Preparing a gentle summary</h2>
          {['Reviewing what you shared', 'Organizing wellbeing signals', 'Preparing supportive next steps'].map((x, i) => (
            <div key={x} className={progress > i ? 'complete' : ''}>
              <span>{progress > i ? <Check /> : i + 1}</span>
              {x}
            </div>
          ))}
        </Card>
      )}
      {phase === 'result' && (
        <>
          <Snapshot data={snapshot} />
          <ContactChoice />
        </>
      )}
    </>
  );
}

function CameraCheck({ onContinue }: { onContinue: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video.current) video.current.srcObject = stream.current;
      setActive(true);
    } catch {
      setError('Camera permission was not available. You can safely skip this step.');
    }
  }
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActive(false);
  }
  useEffect(() => () => stop(), []);
  return (
    <Card className="camera-card">
      <div className="card-heading">
        <div>
          <p className="kicker">Optional camera check-in</p>
          <h2>Notice movement, without recording</h2>
        </div>
        <span className={`camera-status ${active ? 'on' : ''}`}>{active ? 'Camera active' : 'Camera off'}</span>
      </div>
      <p>The camera is optional. Preview stays in your browser; nothing is uploaded as video.</p>
      <div className="camera-preview">
        {active ? (
          <video ref={video} autoPlay muted playsInline />
        ) : (
          <div>
            <VideoOff />
            <span>No camera preview</span>
          </div>
        )}
        {active && (
          <div className="activity-bars" aria-label="Prototype movement activity">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="row">
        {active ? (
          <Button variant="secondary" onClick={stop}>
            <VideoOff />
            Stop camera
          </Button>
        ) : (
          <Button onClick={start}>
            <Camera />
            Start camera
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            stop();
            onContinue();
          }}
        >
          Skip and continue
        </Button>
      </div>
      <small>No facial diagnosis, recognition, age estimation, or emotion diagnosis is performed.</small>
    </Card>
  );
}

const levelClass = (l: Level) => l.toLowerCase();

function Snapshot({ data }: { data: WellbeingSnapshot }) {
  return (
    <Card className="snapshot">
      <p className="kicker">Your wellbeing snapshot</p>
      <h2>A few signals worth noticing</h2>
      <p className="disclaimer">This is a wellbeing summary, not a diagnosis or clinical assessment.</p>
      <div className="snapshot-grid">
        {(
          [
            ['Emotional distress', data.distress],
            ['Safety concern', data.safetyConcern],
            ['Stress', data.stress],
            ['Social isolation', data.socialIsolation],
            ['Sleep disruption', data.sleepDisruption],
            ['Escalation level', data.escalation],
          ] as const
        ).map(([name, level]) => (
          <div key={name}>
            <span>{name}</span>
            <b className={`level ${levelClass(level)}`}>{level}</b>
          </div>
        ))}
      </div>
      <div className="confidence">
        <span>Summary confidence</span>
        <b>{data.confidence}%</b>
        <i>
          <em style={{ width: `${data.confidence}%` }} />
        </i>
      </div>
      <h3>Key contributing factors</h3>
      <div className="tag-row">
        {data.factors.map((f) => (
          <span className="tag" key={f}>
            {f}
          </span>
        ))}
      </div>
      <div className="next-steps">
        <h3>Small next steps</h3>
        <a href="/exercises">
          Try 4–6 calming breathing <ChevronRight />
        </a>
        <a href="/chat">
          Talk through what feels most urgent <ChevronRight />
        </a>
        <a href="/safety-plan">
          Review your safety plan <ChevronRight />
        </a>
      </div>
    </Card>
  );
}

function ContactChoice() {
  const services = getServices();
  const initial: ContactConsent = {
    anonymous: true,
    allowContact: false,
    allowWellbeingSummary: false,
    mobile: '',
    email: '',
    preferredMethod: 'Mobile',
    preferredTime: 'Morning',
  };
  const [consent, setConsent] = useLocalStorage<ContactConsent>('contact-consent', initial);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isApiEnabled() || !services.userProfile.getConsent) return;
    services.userProfile
      .getConsent()
      .then((remote) => {
        setConsent(remote);
        setSharing(!remote.anonymous);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setConsent(consent);
    if (isApiEnabled()) {
      try {
        const saved = await services.userProfile.update(consent);
        setConsent(saved);
        setStatus('Preferences saved to your account.');
        if (features.counsellorHandoff && (consent.allowContact || consent.allowWellbeingSummary)) {
          await services.counsellor.request({
            note: 'Support request from wellbeing check-in',
            allowSummary: consent.allowWellbeingSummary,
          });
        }
        if (features.sms && consent.allowContact && consent.mobile) {
          await services.notification.send({
            channel: 'sms',
            to: consent.mobile,
            subject: 'Wellbeing Support',
            body: 'Your support preferences were saved. A counsellor may follow up if you consented.',
          });
        }
      } catch {
        setStatus('Saved locally. Server sync failed.');
      }
    } else {
      setStatus('Preferences saved locally. Nothing was sent.');
    }
  }

  return (
    <Card className="contact-choice">
      <div className="icon-orb">
        <Shield />
      </div>
      <p className="kicker">Your privacy matters. Your choice matters.</p>
      <h2>Choose how to continue</h2>
      <p>
        You can continue anonymously, or choose to share contact details for follow-up support. <b>Sharing your contact details is optional.</b>
      </p>
      <div className="choice-buttons">
        <button
          className={!sharing ? 'selected' : ''}
          onClick={() => {
            setSharing(false);
            setConsent(initial);
          }}
        >
          <b>Continue Anonymously</b>
          <span>Keep identity fields empty and use local support tools.</span>
        </button>
        <button
          className={sharing ? 'selected' : ''}
          onClick={() => {
            setSharing(true);
            setConsent({ ...consent, anonymous: false });
          }}
        >
          <b>Share My Details</b>
          <span>Choose exactly what may be shared.</span>
        </button>
      </div>
      {!sharing ? (
        <div className="anonymous-box">
          <b>Anonymous session is active</b>
          <ul>
            <li>Anonymous chat and anonymous message are available</li>
            <li>Anonymous call: {features.anonymousCall ? 'Available' : 'Future Integration'}</li>
            <li>No name, phone, or email is requested</li>
          </ul>
          <Button onClick={save}>Save anonymous support request</Button>
        </div>
      ) : (
        <div className="consent-form">
          <div className="editor-row">
            <label className="field">
              <span>Mobile number</span>
              <input type="tel" value={consent.mobile} onChange={(e) => setConsent({ ...consent, mobile: e.target.value })} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={consent.email} onChange={(e) => setConsent({ ...consent, email: e.target.value })} />
            </label>
          </div>
          <div className="editor-row">
            <label className="field">
              <span>Preferred contact method</span>
              <select value={consent.preferredMethod} onChange={(e) => setConsent({ ...consent, preferredMethod: e.target.value })}>
                <option>Mobile</option>
                <option>Email</option>
              </select>
            </label>
            <label className="field">
              <span>Preferred time</span>
              <select value={consent.preferredTime} onChange={(e) => setConsent({ ...consent, preferredTime: e.target.value })}>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={consent.allowContact} onChange={(e) => setConsent({ ...consent, allowContact: e.target.checked })} />
            <span>
              <b>I consent to being contacted</b>
              <small>Independent choice; leave unchecked to decline.</small>
            </span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={consent.allowWellbeingSummary}
              onChange={(e) => setConsent({ ...consent, allowWellbeingSummary: e.target.checked })}
            />
            <span>
              <b>I consent to sharing my wellbeing summary</b>
              <small>Independent choice; not required for contact.</small>
            </span>
          </label>
          <Button onClick={save}>Save choices</Button>
        </div>
      )}
      {status && <p className="success-text">{status}</p>}
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3, FileText, Headphones, LockKeyhole, LogOut, MessageSquareText, Phone, Search, ShieldCheck, UsersRound, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeResolutionPanel } from '@/components/theme-resolution-panel';
import { isApiEnabled } from '@/lib/api';
import { getServices, type AuthUser, type ProfessionalDashboard } from '@/services';

type Role = 'Counsellor' | 'Psychologist' | 'Psychiatrist';
type Patient = {
  id: string;
  name: string;
  anonymous?: boolean;
  score: number;
  level: string;
  signal: string;
  last: string;
  consent: string;
  mood: number[];
  emotion?: string | null;
  riskLevel?: string | null;
  confidence?: number | null;
  checkIns?: Array<{
    id: string;
    theme: string;
    text: string;
    priority?: string | null;
    distress?: number | null;
    safetyRisk?: number | null;
    escalationRisk?: number | null;
    sentimentLabel?: string | null;
    sentimentScore?: number | null;
    stressScore?: number | null;
    emotionLabel?: string | null;
    hasVoice: boolean;
    factors?: string[];
    emotions?: Record<string, number>;
    recommendations?: string[];
    signals?: Record<string, boolean>;
    method?: string | null;
    fallback?: boolean;
    createdAt: string;
  }>;
  videoRecordings?: Array<{
    id: string;
    filename: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: string;
  }>;
  profile?: {
    location: string;
    abhaId: string;
    abhaVerified?: boolean;
    abhaProfile?: Record<string, unknown> | null;
    phone: string;
    gender: string;
    age: number | null;
    email?: string;
    skipped?: boolean;
    updatedAt?: string | null;
  };
};
type QueryItem = { id: string; patient: string; text: string; age: string; priority: string; status?: string };
type ProAppointment = {
  id: string;
  place: string;
  clinician: string;
  date: string;
  time: string;
  mode: string;
  status: string;
  patientId?: string;
};

const ROLE_TO_API: Record<Role, 'COUNSELLOR' | 'PSYCHOLOGIST' | 'PSYCHIATRIST'> = {
  Counsellor: 'COUNSELLOR',
  Psychologist: 'PSYCHOLOGIST',
  Psychiatrist: 'PSYCHIATRIST',
};

const API_TO_ROLE: Record<string, Role> = {
  COUNSELLOR: 'Counsellor',
  PSYCHOLOGIST: 'Psychologist',
  PSYCHIATRIST: 'Psychiatrist',
};

const DEMO_PROFESSIONAL_EMAIL = 'counsellor@wellbeing.care';

const demoPatients: Patient[] = [
  { id: 'P-2041', name: 'Anonymous 2041', score: 82, level: 'High', signal: 'Distress language increased', last: '8 min ago', consent: 'Care summary + contact', mood: [42, 51, 49, 64, 82], profile: { location: 'Indiranagar, Bengaluru', abhaId: '12-3456-7890-1234', phone: '+91 98765 43210', gender: 'Prefer not to say', age: 22 } },
  { id: 'P-1837', name: 'Mira S.', score: 61, level: 'Elevated', signal: 'Low sleep, persistent worry', last: '22 min ago', consent: 'Care summary', mood: [48, 44, 57, 63, 61], profile: { location: 'Koramangala', abhaId: '', phone: '+91 98000 11223', gender: 'Woman', age: 28 } },
  { id: 'P-1902', name: 'Anonymous 1902', score: 38, level: 'Moderate', signal: 'Work stress and isolation', last: '1 hr ago', consent: 'Care summary + contact', mood: [55, 49, 41, 36, 38], profile: { location: '', abhaId: '', phone: '', gender: '', age: null, skipped: true } },
  { id: 'P-1755', name: 'Kabir R.', score: 19, level: 'Low', signal: 'Follow-up check-in', last: 'Yesterday', consent: 'Care summary', mood: [31, 27, 24, 22, 19], profile: { location: 'Whitefield', abhaId: '98-7654-3210-9876', phone: '+91 91234 55667', gender: 'Man', age: 31 } },
];

const demoQueries: QueryItem[] = [
  { id: '1', patient: 'Anonymous 2041', text: 'Can someone help me plan what to say to my family?', age: '6 min', priority: 'Urgent' },
  { id: '2', patient: 'Mira S.', text: 'Is my appointment available as a video consultation?', age: '18 min', priority: 'Normal' },
  { id: '3', patient: 'Kabir R.', text: 'Please share the grounding exercise from our last call.', age: '2 hr', priority: 'Normal' },
];

const demoAppointments: ProAppointment[] = [
  { id: 'a1', place: 'Mira S. · Video consultation', clinician: '', date: '18 SEP', time: '11:00 AM', mode: 'Video', status: 'CONFIRMED' },
  { id: 'a2', place: 'Anonymous 1902 · Phone follow-up', clinician: '', date: '19 SEP', time: '3:00 PM', mode: 'Phone', status: 'REQUESTED' },
  { id: 'a3', place: 'Kabir R. · In-person review', clinician: '', date: '20 SEP', time: '5:30 PM', mode: 'In person', status: 'REQUESTED' },
];

const demoMetrics = { queue: 12, callsToday: 6, openQueries: 3, responseMinutes: 9 };

function formatRelative(isoOrLabel: string) {
  const t = Date.parse(isoOrLabel);
  if (Number.isNaN(t)) return isoOrLabel;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr`;
  return new Date(t).toLocaleDateString();
}

function mapDashboard(data: ProfessionalDashboard) {
  return {
    professionalName: data.professional.displayName || 'Professional',
    role: API_TO_ROLE[data.professional.role] || ('Counsellor' as Role),
    metrics: data.metrics,
    patients: data.patients.map((p) => ({ ...p, last: formatRelative(p.last) })),
    queries: data.queries.map((q) => ({ ...q, age: formatRelative(q.age) })),
    appointments: data.appointments,
  };
}

const PRO_API_ROLES = new Set(['COUNSELLOR', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'ORG_ADMIN']);

export function ProfessionalPortal() {
  const services = getServices();
  const [signedIn, setSignedIn] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<Role>('Counsellor');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<ReturnType<typeof mapDashboard> | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        if (!cancelled) setBootstrapping(false);
        return;
      }
      try {
        const me = await services.authentication.me();
        if (cancelled) return;
        if (me && PRO_API_ROLES.has(me.role)) {
          setUser(me);
          setSignedIn(true);
          await loadDashboard(API_TO_ROLE[me.role] || 'Counsellor', me.displayName);
        }
      } catch {
        /* stay on login */
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadDashboard(fallbackRole: Role, fallbackName?: string | null) {
    setLoadError(null);
    if (!isApiEnabled()) {
      setUsingDemo(true);
      setDashboard({
        professionalName: fallbackName || 'Dr. Aditi Sharma',
        role: fallbackRole,
        metrics: demoMetrics,
        patients: demoPatients,
        queries: demoQueries,
        appointments: demoAppointments,
      });
      return;
    }
    try {
      const data = await services.professional.dashboard();
      setDashboard(mapDashboard(data));
      setUsingDemo(false);
      if (API_TO_ROLE[data.professional.role]) setRole(API_TO_ROLE[data.professional.role]);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Could not load the care dashboard. Sign in with a counsellor account.';
      setLoadError(message);
      setUsingDemo(false);
      setDashboard(null);
      setSignedIn(false);
      setUser(null);
    }
  }

  async function handleEnter(authUser?: AuthUser | null) {
    if (authUser && !PRO_API_ROLES.has(authUser.role)) {
      setLoadError('This account is a patient profile. Sign in with counsellor@wellbeing.care (or another professional account) to see real check-ins and scores.');
      setSignedIn(false);
      setDashboard(null);
      return;
    }
    setUser(authUser ?? null);
    setSignedIn(true);
    await loadDashboard(
      authUser ? API_TO_ROLE[authUser.role] || role : role,
      authUser?.displayName,
    );
  }

  async function handleSignOut() {
    try {
      await services.authentication.signOut();
    } catch {
      /* ignore */
    }
    setSignedIn(false);
    setUser(null);
    setDashboard(null);
    setUsingDemo(false);
    setLoadError(null);
  }

  if (bootstrapping) {
    return (
      <div className="professional-access">
        <Card className="access-card">
          <p className="kicker">Professional portal</p>
          <h2>Checking your session…</h2>
        </Card>
      </div>
    );
  }

  if (!signedIn || !dashboard) {
    return (
      <ProfessionalAccess
        mode={mode}
        setMode={setMode}
        role={role}
        setRole={setRole}
        onEnter={handleEnter}
        loadError={loadError}
      />
    );
  }

  return (
    <ProfessionalDashboard
      role={dashboard.role || role}
      professionalName={dashboard.professionalName}
      metrics={dashboard.metrics}
      patients={dashboard.patients}
      queries={dashboard.queries}
      appointments={dashboard.appointments}
      usingDemo={usingDemo}
      onRefresh={() => loadDashboard(role, user?.displayName)}
      onSignOut={handleSignOut}
    />
  );
}

function ProfessionalAccess({
  mode,
  setMode,
  role,
  setRole,
  onEnter,
  loadError,
}: {
  mode: 'login' | 'signup';
  setMode: (v: 'login' | 'signup') => void;
  role: Role;
  setRole: (r: Role) => void;
  onEnter: (user?: AuthUser | null) => void | Promise<void>;
  loadError?: string | null;
}) {
  const services = getServices();
  const [email, setEmail] = useState(mode === 'login' ? 'counsellor@wellbeing.care' : '');
  const [password, setPassword] = useState(mode === 'login' ? 'prototype' : '');
  const [displayName, setDisplayName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(nextMode: 'login' | 'signup') {
    setMode(nextMode);
    setError(null);
    if (nextMode === 'login') {
      setEmail((current) => current || DEMO_PROFESSIONAL_EMAIL);
      setPassword((current) => current || 'prototype');
    } else {
      setEmail('');
      setPassword('');
    }
  }

  async function submit() {
    setError(null);
    if (mode === 'signup' && !agreed) {
      setError('Please agree to professional and privacy standards.');
      return;
    }
    if (!isApiEnabled()) {
      await onEnter(null);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const loginPassword = email.trim().toLowerCase() === DEMO_PROFESSIONAL_EMAIL ? '' : password;
        const result = await services.authentication.signIn(email, loginPassword);
        await onEnter(result.user);
      } else {
        const result = await services.authentication.signUp({
          email,
          password,
          displayName: displayName || email,
          role: ROLE_TO_API[role],
          licenceNumber: licenceNumber || 'PENDING',
        });
        await onEnter(result.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="professional-access">
      <section className="professional-welcome">
        <span className="professional-mark"><ShieldCheck /></span>
        <p className="kicker">Professional care portal</p>
        <h2>Make every response feel informed and human.</h2>
        <p>Review consented wellbeing signals, respond to patient queries, manage calls, and keep follow-up work in one calm workspace.</p>
        <div className="professional-benefits">
          <span><Activity />Prioritized care queue</span>
          <span><Headphones />Secure call workspace</span>
          <span><ClipboardCheck />Clear follow-up updates</span>
        </div>
        <p className="portal-disclaimer">Sign in as a counsellor to load live consented patient profiles and check-in scores</p>
      </section>
      <Card className="auth-card">
        <Link className="professional-header-link auth-switch" href="/login">USER LOGIN</Link>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button>
        </div>
        <p className="kicker">{mode === 'login' ? 'Welcome back' : 'Join the care network'}</p>
        <h2>{mode === 'login' ? 'Access your workspace' : 'Professional registration'}</h2>
        <div className="role-select" role="group" aria-label="Professional role">
          {(['Counsellor', 'Psychologist', 'Psychiatrist'] as Role[]).map((r) => (
            <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{r}</button>
          ))}
        </div>
        {mode === 'signup' && (
          <label className="field">
            <span>Full name</span>
            <input placeholder="Dr. Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span>Professional email</span>
          <input type="email" placeholder="name@clinic.org" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {mode === 'signup' && (
          <>
            <label className="field">
              <span>Registration / licence number</span>
              <input placeholder="Required for verification" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                <b>I agree to professional and privacy standards</b>
                <small>Credentials would be verified before live access.</small>
              </span>
            </label>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
        {loadError && !error && <p className="error-text">{loadError}</p>}
        <Button className="auth-submit" onClick={submit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? (isApiEnabled() ? 'Sign in' : 'Open demo dashboard') : isApiEnabled() ? 'Create account' : 'Create prototype account'} <ChevronRight />
        </Button>
        <p className="fine-print" style={{ marginTop: 12 }}>
          To see real signed-up patients and ML scores, sign in here as a counsellor (not with a patient account). Demo: <b>counsellor@wellbeing.care</b> / <b>prototype</b>.
        </p>
        <div className="demo-account-box">
          <p className="kicker">Demo accounts</p>
          <p className="fine-print" style={{ marginBottom: 10 }}>
            Password for both: <b>prototype</b>
          </p>
          <div className="demo-account-cards">
            <button
              type="button"
              className="demo-account-card"
              onClick={() => {
                switchMode('login');
                setEmail(DEMO_PROFESSIONAL_EMAIL);
                setPassword('prototype');
              }}
            >
              <b>Counsellor</b>
              <span>{DEMO_PROFESSIONAL_EMAIL}</span>
              <small>Fills this form for professional login</small>
            </button>
            <Link className="demo-account-card" href="/login">
              <b>User</b>
              <span>user@wellbeing.care</span>
              <small>Open user login / signup page</small>
            </Link>
          </div>
        </div>
        <p className="auth-note">
          <LockKeyhole /> {isApiEnabled()
            ? 'Connected to the support API. Use verified professional credentials.'
            : 'This is a simulated access flow. Production requires verified credentials, secure authentication, audit logs, and role-based permissions.'}
        </p>
      </Card>
    </div>
  );
}

function ProfessionalDashboard({
  role,
  professionalName,
  metrics,
  patients,
  queries,
  appointments,
  usingDemo,
  onRefresh,
  onSignOut,
}: {
  role: Role;
  professionalName: string;
  metrics: { queue: number; callsToday: number; openQueries: number; responseMinutes: number };
  patients: Patient[];
  queries: QueryItem[];
  appointments: ProAppointment[];
  usingDemo: boolean;
  onRefresh: () => void | Promise<void>;
  onSignOut: () => void;
}) {
  const services = getServices();
  const [section, setSection] = useState('Overview');
  const [selectedId, setSelectedId] = useState(patients[0]?.id ?? '');
  const [resolved, setResolved] = useState<string[]>([]);
  const [call, setCall] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [confirmedAppointmentIds, setConfirmedAppointmentIds] = useState<string[]>([]);
  const [hiddenQueryIds, setHiddenQueryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!patients.some((p) => p.id === selectedId)) {
      setSelectedId(patients[0]?.id ?? '');
    }
  }, [patients, selectedId]);

  const selected = patients.find((p) => p.id === selectedId) || patients[0] || null;
  const apptList = appointments.map((appointment) =>
    confirmedAppointmentIds.includes(appointment.id)
      ? { ...appointment, status: 'CONFIRMED' }
      : appointment,
  );
  const queryList = queries.filter((query) => !hiddenQueryIds.includes(query.id));
  const filtered = patients.filter((p) => `${p.name} ${p.id}`.toLowerCase().includes(search.toLowerCase()));
  const openQueryCount = queryList.filter((q) => !resolved.includes(q.id) && q.status !== 'RESOLVED').length;
  const initials = professionalName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'PR';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const nav = [
    ['Overview', Activity],
    ['Care queue', UsersRound],
    ['Calls', Video],
    ['Queries', MessageSquareText],
    ['Appointments', CalendarDays],
    ['Updates', Bell],
  ] as const;

  async function replyToQuery(id: string) {
    const reply = window.prompt('Reply to patient query:');
    if (!reply?.trim()) return;
    if (isApiEnabled() && !usingDemo) {
      try {
        await services.professional.replyQuery(id, reply.trim());
        setResolved((r) => [...r, id]);
        setHiddenQueryIds((ids) => [...ids, id]);
        await onRefresh();
        return;
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not send reply.');
        return;
      }
    }
    setResolved((r) => [...r, id]);
  }

  async function resolveQuery(id: string) {
    if (resolved.includes(id)) return;
    if (isApiEnabled() && !usingDemo) {
      try {
        await services.professional.resolveQuery(id);
        setResolved((r) => [...r, id]);
        setHiddenQueryIds((ids) => [...ids, id]);
        await onRefresh();
        return;
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not resolve query.');
        return;
      }
    }
    setResolved((r) => [...r, id]);
  }

  async function manageAvailability() {
    const accept = window.confirm('Accept priority requests and stay available?');
    if (isApiEnabled() && !usingDemo) {
      try {
        await services.professional.setAvailability({ available: true, acceptPriority: accept });
        window.alert(accept ? 'Availability updated: accepting priority requests.' : 'Availability updated.');
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not update availability.');
      }
    } else {
      window.alert(accept ? 'Prototype: marked available for priority requests.' : 'Prototype: availability unchanged.');
    }
  }

  async function confirmAppointment(id: string) {
    if (isApiEnabled() && !usingDemo) {
      try {
        await services.care.updateAppointment(id, 'Confirmed');
        setConfirmedAppointmentIds((ids) => [...ids, id]);
        await onRefresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not confirm appointment.');
      }
      return;
    }
    setConfirmedAppointmentIds((ids) => [...ids, id]);
  }

  return (
    <div className="professional-dashboard">
      <aside className="professional-side">
        <div className="professional-brand">
          <span>✦</span>
          <div>
            <b>Wellbeing Support</b>
            <small>Professional portal</small>
          </div>
        </div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={section === label ? 'active' : ''} onClick={() => setSection(label)}>
              <Icon />
              {label}
              {label === 'Queries' && <span>{openQueryCount}</span>}
            </button>
          ))}
        </nav>
        <div className="professional-profile">
          <span>{initials}</span>
          <div>
            <b>{professionalName}</b>
            <small>{role}</small>
          </div>
          <button aria-label="Sign out" onClick={onSignOut}><LogOut /></button>
        </div>
      </aside>
      <main className="professional-main">
        <header className="professional-header">
          <div>
            <p className="kicker">{todayLabel}</p>
            <h1>{section}</h1>
          </div>
          <div className="professional-tools">
            <div className="search">
              <Search />
              <input aria-label="Search patients" placeholder="Search patient" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="notification" aria-label="Open queries" title="Open queries" onClick={() => setSection('Queries')}><Bell /><span>{Math.min(openQueryCount, 9)}</span></button>
          </div>
        </header>
        <div className={`demo-banner ${usingDemo ? '' : 'live-banner'}`} style={{ margin: '0 0 16px' }}>
          <div>
            <b>{usingDemo ? 'Sample demo patients' : 'Live patient queue'}</b>
            <p>
              {usingDemo
                ? 'API is offline — showing prototype sample cards only.'
                : `${patients.length} real account${patients.length === 1 ? '' : 's'} with profile details and/or check-in scores.`}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void onRefresh()}>Refresh</button>
        </div>
        {!usingDemo && patients.length === 0 && (
          <Card className="empty-state" style={{ marginBottom: 16, padding: 24 }}>
            <h2>No patients in the queue yet</h2>
            <p>Registered users appear here after they save profile details or complete a check-in.</p>
          </Card>
        )}
        {section === 'Overview' && (
          selected ? (
            <Overview
              metrics={metrics}
              patients={patients}
              selected={selected}
              setSelected={(patient) => setSelectedId(patient.id)}
              setCall={setCall}
            />
          ) : (
            <Card className="empty-state" style={{ padding: 24 }}>
              <h2>No patients to review</h2>
              <p>Once someone signs up and saves profile details or completes a check-in, they show up here with scores.</p>
            </Card>
          )
        )}
        {section === 'Care queue' && (
          selected ? (
            <CareQueue patients={filtered} selected={selected} setSelected={(patient) => setSelectedId(patient.id)} setCall={setCall} />
          ) : (
            <Card className="empty-state" style={{ padding: 24 }}>
              <h2>Care queue is empty</h2>
              <p>Ask the person to sign up, save profile details, or submit a check-in — then hit Refresh.</p>
            </Card>
          )
        )}
        {section === 'Queries' && (
          <QueryCenter
            queries={queryList}
            resolved={resolved}
            onReply={replyToQuery}
            onResolve={resolveQuery}
          />
        )}
        {section === 'Calls' && (
          <Calls patients={patients} setCall={setCall} onManageAvailability={manageAvailability} />
        )}
        {section === 'Appointments' && (
          <ProfessionalAppointments appointments={apptList} onConfirm={confirmAppointment} />
        )}
        {section === 'Updates' && <Updates />}
      </main>
      {call && <CallRoom patient={call} onClose={() => setCall(null)} />}
    </div>
  );
}

function RiskBadge({ patient }: { patient: Patient }) {
  return (
    <div className={`risk-score risk-${patient.level.toLowerCase()}`}>
      <b>{patient.score}</b>
      <span>{patient.level}</span>
    </div>
  );
}

function MeterBar({ label, value, tone = 'neutral' }: { label: string; value: number | null | undefined; tone?: 'neutral' | 'warn' | 'danger' | 'ok' }) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
  return (
    <div className={`ml-meter tone-${tone}`}>
      <div className="ml-meter-label">
        <span>{label}</span>
        <b>{n == null ? '—' : n}</b>
      </div>
      <div className="ml-meter-track" aria-hidden="true">
        <i style={{ width: `${n ?? 0}%` }} />
      </div>
    </div>
  );
}

function MlInsights({ patient }: { patient: Patient }) {
  const checkIns = patient.checkIns ?? [];
  const latest = checkIns[0];
  if (!latest) return null;

  const trend = [...checkIns].reverse().map((ci) => ({
    at: ci.createdAt,
    distress: typeof ci.distress === 'number' ? ci.distress : 0,
    safety: typeof ci.safetyRisk === 'number' ? Math.round(ci.safetyRisk) : 0,
    escalation: typeof ci.escalationRisk === 'number' ? ci.escalationRisk : 0,
    label: new Date(ci.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const emotionEntries = Object.entries(latest.emotions || {})
    .map(([k, v]) => [k, typeof v === 'number' ? v : 0] as const)
    .sort((a, b) => b[1] - a[1]);
  const emotionMax = Math.max(1, ...emotionEntries.map(([, v]) => (v <= 1 ? v * 100 : v)));
  const activeSignals = Object.entries(latest.signals || {})
    .filter(([, on]) => Boolean(on))
    .map(([k]) => k.replace(/_/g, ' '));
  const factors = latest.factors?.length ? latest.factors : [];
  const recommendations = latest.recommendations?.length ? latest.recommendations : [];

  return (
    <div className="ml-insights">
      <div className="chart-label">
        <span>ML analysis infographics</span>
        <small>
          Latest check-in · {latest.priority ?? 'unscored'}
          {latest.method ? ` · ${latest.method}` : ''}
          {latest.fallback ? ' · heuristic fallback' : ''}
        </small>
      </div>

      <div className="ml-score-grid">
        <MeterBar label="Distress" value={latest.distress} tone={(latest.distress ?? 0) >= 75 ? 'danger' : (latest.distress ?? 0) >= 55 ? 'warn' : 'ok'} />
        <MeterBar label="Safety risk" value={latest.safetyRisk} tone={(latest.safetyRisk ?? 0) >= 70 ? 'danger' : (latest.safetyRisk ?? 0) >= 40 ? 'warn' : 'ok'} />
        <MeterBar label="Escalation" value={latest.escalationRisk} tone={(latest.escalationRisk ?? 0) >= 70 ? 'danger' : (latest.escalationRisk ?? 0) >= 40 ? 'warn' : 'neutral'} />
        <MeterBar
          label="Voice stress"
          value={latest.stressScore != null ? Math.round(latest.stressScore <= 1 ? latest.stressScore * 100 : latest.stressScore) : null}
          tone="neutral"
        />
      </div>

      <div className="ml-insight-split">
        <div className="ml-panel">
          <div className="chart-label">
            <span>Distress trend</span>
            <small>Recent check-ins</small>
          </div>
          <div className="ml-trend" role="img" aria-label="Distress trend chart">
            {trend.map((point, i) => (
              <div key={`${point.at}-${i}`} className="ml-trend-col">
                <div className="ml-trend-bars">
                  <i className="distress" style={{ height: `${Math.max(4, point.distress)}%` }} title={`Distress ${point.distress}`} />
                  <i className="safety" style={{ height: `${Math.max(4, point.safety)}%` }} title={`Safety ${point.safety}`} />
                  <i className="escalation" style={{ height: `${Math.max(4, point.escalation)}%` }} title={`Escalation ${point.escalation}`} />
                </div>
                <small>{point.label}</small>
              </div>
            ))}
          </div>
          <div className="ml-legend">
            <span><i className="distress" /> Distress</span>
            <span><i className="safety" /> Safety</span>
            <span><i className="escalation" /> Escalation</span>
          </div>
        </div>

        <div className="ml-panel">
          <div className="chart-label">
            <span>Emotion mix</span>
            <small>{latest.emotionLabel || latest.sentimentLabel || 'From text model'}</small>
          </div>
          {emotionEntries.length ? (
            <ul className="ml-emotion-list">
              {emotionEntries.map(([name, raw]) => {
                const pct = Math.round(raw <= 1 ? raw * 100 : raw);
                const width = Math.round((pct / emotionMax) * 100);
                return (
                  <li key={name}>
                    <span>{name}</span>
                    <div className="ml-emotion-track"><i style={{ width: `${width}%` }} /></div>
                    <b>{pct}%</b>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ml-empty">No emotion breakdown on this check-in yet.</p>
          )}
          <div className="ml-chips">
            {latest.sentimentLabel && <span className="ml-chip">Sentiment · {latest.sentimentLabel}</span>}
            {latest.sentimentScore != null && (
              <span className="ml-chip">Score · {(latest.sentimentScore <= 1 ? latest.sentimentScore * 100 : latest.sentimentScore).toFixed(0)}%</span>
            )}
            {latest.hasVoice && <span className="ml-chip">Voice attached</span>}
          </div>
        </div>
      </div>

      {(factors.length > 0 || activeSignals.length > 0) && (
        <div className="ml-panel">
          <div className="chart-label">
            <span>Detected factors & signals</span>
            <small>Prototype NLP flags — review clinically</small>
          </div>
          <div className="ml-chips">
            {factors.map((f) => (
              <span key={`f-${f}`} className="ml-chip factor">{f.replace(/_/g, ' ')}</span>
            ))}
            {activeSignals.map((s) => (
              <span key={`s-${s}`} className="ml-chip signal">{s}</span>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="ml-panel">
          <div className="chart-label">
            <span>Model suggestions</span>
            <small>Decision support only</small>
          </div>
          <ul className="ml-recs">
            {recommendations.slice(0, 5).map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Overview({
  metrics,
  patients,
  selected,
  setSelected,
  setCall,
}: {
  metrics: { queue: number; callsToday: number; openQueries: number; responseMinutes: number };
  patients: Patient[];
  selected: Patient;
  setSelected: (p: Patient) => void;
  setCall: (p: Patient) => void;
}) {
  return (
    <>
      <div className="professional-metrics">
        <Card>
          <span className="metric-icon lavender"><UsersRound /></span>
          <div>
            <small>Patients in queue</small>
            <b>{metrics.queue}</b>
            <em>{Math.min(4, metrics.queue)} need review</em>
          </div>
        </Card>
        <Card>
          <span className="metric-icon peach"><Video /></span>
          <div>
            <small>Calls today</small>
            <b>{metrics.callsToday}</b>
            <em>Next in 18 min</em>
          </div>
        </Card>
        <Card>
          <span className="metric-icon green"><MessageSquareText /></span>
          <div>
            <small>Open queries</small>
            <b>{metrics.openQueries}</b>
            <em>1 marked urgent</em>
          </div>
        </Card>
        <Card>
          <span className="metric-icon blue"><Clock3 /></span>
          <div>
            <small>Response time</small>
            <b>{metrics.responseMinutes}m</b>
            <em>Within team goal</em>
          </div>
        </Card>
      </div>
      <div className="professional-grid">
        <Card className="queue-card">
          <div className="card-heading">
            <div>
              <p className="kicker">Prioritized by prototype signal</p>
              <h2>Patient care queue</h2>
            </div>
            <button className="text-button">View all <ChevronRight /></button>
          </div>
          <div className="patient-list">
            {patients.map((p) => (
              <button key={p.id} className={selected.id === p.id ? 'active' : ''} onClick={() => setSelected(p)}>
                <span className="patient-avatar">{p.name.startsWith('Anonymous') ? 'A' : p.name[0]}</span>
                <span className="patient-main">
                  <b>{p.name}</b>
                  <small>{p.signal} · {p.last}</small>
                </span>
                <RiskBadge patient={p} />
                <ChevronRight />
              </button>
            ))}
          </div>
        </Card>
        <PatientPanel patient={selected} setCall={setCall} />
      </div>
    </>
  );
}

function PatientPanel({ patient }: { patient: Patient; setCall?: (p: Patient) => void }) {
  const services = getServices();
  const profile = patient.profile;
  const [composeOpen, setComposeOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState('11:00');
  const [scheduleMode, setScheduleMode] = useState<'Phone' | 'Video meet'>('Video meet');
  const [scheduleNote, setScheduleNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (playingVideoUrl) URL.revokeObjectURL(playingVideoUrl);
    };
  }, [playingVideoUrl]);

  useEffect(() => {
    if (playingVideoUrl) URL.revokeObjectURL(playingVideoUrl);
    setPlayingVideoUrl(null);
    setPlayingVideoId(null);
    setError('');
    setStatus('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset media when switching patients
  }, [patient.id]);

  async function playPatientVideo(recordingId: string) {
    if (!isApiEnabled()) {
      setError('API is required to play patient videos.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (playingVideoUrl) URL.revokeObjectURL(playingVideoUrl);
      setPlayingVideoUrl(null);
      setPlayingVideoId(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('wellbeing-support:auth-token') : null;
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const res = await fetch(
        `${base}/api/professional/patients/${encodeURIComponent(patient.id)}/recordings/${encodeURIComponent(recordingId)}/file`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `Could not load video (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPlayingVideoId(recordingId);
      setPlayingVideoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not play video recording.');
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = [
    ['Location', profile?.location || 'Not provided'],
    ['ABHA ID', profile?.abhaId ? `${profile.abhaId}${profile.abhaVerified ? ' · verified' : ''}` : 'Not provided'],
    ['Phone', profile?.phone || 'Not provided'],
    ['Gender', profile?.gender || 'Not provided'],
    ['Age', profile?.age != null ? String(profile.age) : 'Not provided'],
  ];
  if (profile?.email) rows.push(['Email', profile.email]);
  if (profile?.abhaProfile && typeof profile.abhaProfile.name === 'string') {
    rows.push(['ABHA name', String(profile.abhaProfile.name)]);
  }

  async function sendMessage() {
    if (!messageText.trim()) {
      setError('Write a short message first.');
      return;
    }
    if (!isApiEnabled() || !services.professional.messagePatient) {
      setError('API is required to message patients.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await services.professional.messagePatient(patient.id, messageText.trim());
      setStatus(result.message);
      setMessageText('');
      setComposeOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setBusy(false);
    }
  }

  async function scheduleCall() {
    if (!isApiEnabled() || !services.professional.schedulePatientCall) {
      setError('API is required to schedule calls.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await services.professional.schedulePatientCall(patient.id, {
        date: scheduleDate,
        time: scheduleTime,
        mode: scheduleMode,
        note: scheduleNote.trim() || undefined,
      });
      setStatus(result.message);
      setScheduleOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not schedule call.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="patient-panel">
      <div className="patient-panel-head">
        <span className="patient-avatar large">{patient.name[0]}</span>
        <div>
          <small>{patient.id}</small>
          <h2>{patient.name}</h2>
          <span className="consent-pill"><Check />Consent: {patient.consent}</span>
          {patient.anonymous ? <span className="anon-pill">Anonymous user</span> : null}
        </div>
        <RiskBadge patient={patient} />
      </div>
      <div className="signal-callout">
        <Activity />
        <div>
          <b>Current care signal</b>
          <p>{patient.signal}. Review the conversation summary and use clinical judgment.</p>
          {(patient.emotion || patient.riskLevel) && (
            <p className="aria-signal-meta">
              {patient.emotion ? `Emotion: ${patient.emotion}` : null}
              {patient.emotion && patient.riskLevel ? ' · ' : null}
              {patient.riskLevel ? `Priority/risk: ${patient.riskLevel}` : null}
              {patient.confidence != null ? ` · confidence ${(patient.confidence * 100).toFixed(0)}%` : null}
            </p>
          )}
        </div>
      </div>
      <MlInsights patient={patient} />
      {patient.checkIns?.[0]?.theme && (
        <div className="patient-theme-help">
          <ThemeResolutionPanel
            themeId={patient.checkIns[0].theme}
            compact
            title={`Resolution paths for ${patient.name}'s latest theme`}
          />
        </div>
      )}
      {patient.checkIns && patient.checkIns.length > 0 && (
        <div className="patient-checkins">
          <div className="chart-label">
            <span>Recent ML check-ins</span>
            <small>Text/voice assessments</small>
          </div>
          <ul className="checkin-pro-list">
            {patient.checkIns.map((ci) => (
              <li key={ci.id}>
                <div>
                  <b>{ci.theme.replace(/_/g, ' ')}</b>
                  <small>
                    {new Date(ci.createdAt).toLocaleString()} · {ci.priority ?? '—'}
                    {' · '}distress {ci.distress ?? '—'}
                    {' · '}safety {ci.safetyRisk != null ? Math.round(ci.safetyRisk) : '—'}
                    {' · '}escalation {ci.escalationRisk ?? '—'}
                    {ci.sentimentLabel ? ` · ${ci.sentimentLabel}` : ''}
                  </small>
                  {ci.text && <p>{ci.text}</p>}
                  {!!ci.factors?.length && (
                    <div className="ml-chips compact">
                      {ci.factors.slice(0, 4).map((f) => (
                        <span key={f} className="ml-chip factor">{f.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                </div>
                {ci.hasVoice && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const token = typeof window !== 'undefined' ? localStorage.getItem('wellbeing-support:auth-token') : null;
                      const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
                      void fetch(`${base}/api/checkins/${ci.id}/voice`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const audio = new Audio(url);
                          audio.onended = () => URL.revokeObjectURL(url);
                          void audio.play();
                        })
                        .catch(() => undefined);
                    }}
                  >
                    Listen
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {patient.videoRecordings && patient.videoRecordings.length > 0 && (
        <div className="patient-checkins patient-videos">
          <div className="chart-label">
            <span>Wellbeing video recordings</span>
            <small>Shared under care-summary consent · under {patient.name}</small>
          </div>
          <ul className="checkin-pro-list">
            {patient.videoRecordings.map((rec) => (
              <li key={rec.id}>
                <div>
                  <b><Video size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Video conversation</b>
                  <small>
                    {new Date(rec.createdAt).toLocaleString()}
                    {rec.sizeBytes ? ` · ${Math.max(1, Math.round(rec.sizeBytes / 1024))} KB` : ''}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void playPatientVideo(rec.id)}
                >
                  {playingVideoId === rec.id ? 'Playing' : 'Watch'}
                </button>
              </li>
            ))}
          </ul>
          {playingVideoUrl && (
            <div className="patient-video-player">
              <video key={playingVideoUrl} controls autoPlay src={playingVideoUrl} />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (playingVideoUrl) URL.revokeObjectURL(playingVideoUrl);
                  setPlayingVideoUrl(null);
                  setPlayingVideoId(null);
                }}
              >
                Close video
              </button>
            </div>
          )}
        </div>
      )}
      <div className="patient-profile-block">
        <div className="chart-label">
          <span>Profile details</span>
          <small>{profile?.skipped ? 'User skipped optional profile' : profile?.updatedAt ? `Updated ${new Date(profile.updatedAt).toLocaleDateString()}` : 'From account profile'}</small>
        </div>
        <dl className="patient-profile-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="signal-chart">
        <div className="chart-label">
          <span>Support signal history</span>
          <small>{patient.checkIns?.length ? 'Distress from recent ML check-ins' : 'Last 5 mood samples'}</small>
        </div>
        <div className="spark-bars">
          {(patient.checkIns?.length
            ? [...patient.checkIns].reverse().map((ci) => Math.round(ci.distress ?? 0))
            : patient.mood
          ).map((n, i) => (
            <i key={i} style={{ height: `${Math.max(8, n)}%` }}><span>{n}</span></i>
          ))}
        </div>
      </div>
      <div className="patient-actions">
        <Button onClick={() => { setScheduleOpen(true); setError(''); setStatus(''); }}><CalendarDays />Schedule call</Button>
        <Button variant="secondary" onClick={() => { setComposeOpen(true); setError(''); setStatus(''); }}><MessageSquareText />Message</Button>
      </div>
      {status && <p className="success-text" role="status"><Check size={16} /> {status}</p>}
      {error && <p className="error-text">{error}</p>}
      <p className="fine-print">This prototype score is illustrative, non-diagnostic, and never replaces clinical assessment or emergency protocol.</p>

      {composeOpen && (
        <div className="mini-modal" role="dialog" aria-modal="true">
          <div>
            <h3>Message {patient.name}</h3>
            <p>They will see this under Care messages. If they have an email on file, a notification is also logged/sent.</p>
            <label className="field">
              <span>Message</span>
              <textarea rows={5} value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Write a supportive follow-up…" />
            </label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => void sendMessage()} disabled={busy}>{busy ? 'Sending…' : 'Send message'}</Button>
              <Button variant="secondary" onClick={() => setComposeOpen(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className="mini-modal" role="dialog" aria-modal="true">
          <div>
            <h3>Schedule a call</h3>
            <p>Choose date, time, and mode. The patient gets an in-app notice{profile?.email ? ` and email to ${profile.email}` : ''}.</p>
            <div className="editor-row">
              <label className="field">
                <span>Date</span>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </label>
              <label className="field">
                <span>Time</span>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Mode</span>
              <select value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as 'Phone' | 'Video meet')}>
                <option value="Phone">Phone</option>
                <option value="Video meet">Video meet</option>
              </select>
            </label>
            <label className="field">
              <span>Note (optional)</span>
              <input value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} placeholder="Bring recent sleep notes…" />
            </label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => void scheduleCall()} disabled={busy}>{busy ? 'Scheduling…' : 'Confirm schedule'}</Button>
              <Button variant="secondary" onClick={() => setScheduleOpen(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function CareQueue({
  patients: queuePatients,
  selected,
  setSelected,
  setCall,
}: {
  patients: Patient[];
  selected: Patient;
  setSelected: (p: Patient) => void;
  setCall: (p: Patient) => void;
}) {
  return (
    <div className="professional-grid">
      <Card className="queue-card">
        <div className="card-heading">
          <div>
            <p className="kicker">Consented patients</p>
            <h2>Full care queue</h2>
          </div>
          <span className="queue-count">{queuePatients.length} visible</span>
        </div>
        <div className="patient-list">
          {queuePatients.map((p) => (
            <button key={p.id} className={selected.id === p.id ? 'active' : ''} onClick={() => setSelected(p)}>
              <span className="patient-avatar">{p.name[0]}</span>
              <span className="patient-main">
                <b>{p.name}</b>
                <small>{p.signal}</small>
              </span>
              <RiskBadge patient={p} />
              <ChevronRight />
            </button>
          ))}
        </div>
      </Card>
      <PatientPanel patient={selected} setCall={setCall} />
    </div>
  );
}

function QueryCenter({
  queries,
  resolved,
  onReply,
  onResolve,
}: {
  queries: QueryItem[];
  resolved: string[];
  onReply: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const open = queries.filter((q) => !resolved.includes(q.id)).length;
  return (
    <Card className="queries-card">
      <div className="card-heading">
        <div>
          <p className="kicker">Patient messages</p>
          <h2>Queries needing a response</h2>
        </div>
        <span className="queue-count">{open} open</span>
      </div>
      <div className="query-list">
        {queries.map((q) => (
          <article key={q.id} className={resolved.includes(q.id) ? 'resolved' : ''}>
            <span className="patient-avatar">{q.patient[0]}</span>
            <div>
              <div className="query-meta">
                <b>{q.patient}</b>
                <span className={q.priority === 'Urgent' ? 'urgent' : ''}>{q.priority}</span>
                <small>{q.age} ago</small>
              </div>
              <p>{q.text}</p>
              <div className="row">
                <Button variant="secondary" onClick={() => onReply(q.id)}><MessageSquareText />Reply</Button>
                <Button variant="ghost" onClick={() => onResolve(q.id)}>
                  <Check />{resolved.includes(q.id) ? 'Resolved' : 'Mark resolved'}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function Calls({
  patients,
  setCall,
  onManageAvailability,
}: {
  patients: Patient[];
  setCall: (p: Patient) => void;
  onManageAvailability: () => void;
}) {
  const slots = patients.slice(0, 3);
  return (
    <div className="schedule-layout">
      <Card className="today-schedule">
        <p className="kicker">Today’s schedule</p>
        <h2>Calls and consultations</h2>
        {slots.map((p, i) => (
          <div className="schedule-item" key={p.id}>
            <span>{['10:30', '12:00', '15:30'][i]}<small>{i < 2 ? 'AM' : 'PM'}</small></span>
            <div>
              <b>{p.name}</b>
              <small>{i === 1 ? 'Follow-up · 30 min' : 'Initial consultation · 45 min'}</small>
            </div>
            <Button variant={i === 0 ? 'primary' : 'secondary'} onClick={() => setCall(p)}>
              {i === 0 ? 'Join call' : 'View'}
            </Button>
          </div>
        ))}
      </Card>
      <Card className="availability-card">
        <p className="kicker">Availability</p>
        <h2>You’re available</h2>
        <p>New care requests can be added to your queue until 5:30 PM.</p>
        <label className="check">
          <input type="checkbox" defaultChecked />
          <span>
            <b>Accept priority requests</b>
            <small>Show me in urgent professional handoff.</small>
          </span>
        </label>
        <Button variant="secondary" onClick={onManageAvailability}>Manage availability</Button>
      </Card>
    </div>
  );
}

function ProfessionalAppointments({
  appointments,
  onConfirm,
}: {
  appointments: ProAppointment[];
  onConfirm: (id: string) => void;
}) {
  const items = appointments.length
    ? appointments
    : demoAppointments;

  return (
    <Card className="queries-card">
      <p className="kicker">This week</p>
      <h2>Appointment requests</h2>
      {items.map((a, i) => {
        const label = a.place.includes('·') ? a.place : `${a.place}${a.mode ? ` · ${a.mode}` : ''}`;
        const statusLabel = /confirm|CONFIRMED/i.test(a.status) ? 'Confirmed' : 'Requested';
        const day = a.date.match(/\d+/)?.[0] || String(18 + i);
        return (
          <div className="professional-appointment" key={a.id}>
            <span className="date-tile"><b>{day}</b><small>SEP</small></span>
            <div>
              <b>{label}</b>
              <small>{a.time} · {statusLabel}</small>
            </div>
            <div className="row">
              <Button variant="secondary">Review</Button>
              {statusLabel !== 'Confirmed' && (
                <Button onClick={() => onConfirm(a.id)}>Confirm</Button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function Updates() {
  const services = getServices();
  const [logs, setLogs] = useState<Array<{
    id: string;
    to: string;
    notificationType: string;
    subject: string | null;
    body: string | null;
    status: string;
    createdAt: string;
    patientName?: string;
  }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled() || !services.professional.notifications) {
        setLoading(false);
        setError('API required to load email notification logs.');
        return;
      }
      try {
        const rows = await services.professional.notifications();
        if (!cancelled) setLogs(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load email logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="queries-card">
      <p className="kicker">Email notifications</p>
      <h2>Messages sent to users</h2>
      <p className="portal-disclaimer">
        Sign-in, signup, appointments, counsellor messages, and scheduled calls are emailed when the user has an address on file.
        With <code>NOTIFICATION_MODE=log</code> they are logged; set <code>live</code> + <code>RESEND_API_KEY</code> to send via Resend.
      </p>
      {loading && <p>Loading notification log…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && logs.length === 0 && (
        <p>No emails logged yet. Sign in as a patient or send a counsellor message to generate one.</p>
      )}
      <div className="update-timeline">
        {logs.map((log) => (
          <article key={log.id}>
            <span><Bell /></span>
            <div>
              <b>{log.subject || log.notificationType}</b>
              <p>
                To {log.patientName || log.to} · {log.notificationType.replace(/_/g, ' ')} · status <em>{log.status}</em>
              </p>
              {log.body && <small className="email-log-body">{log.body.slice(0, 180)}{log.body.length > 180 ? '…' : ''}</small>}
              <small>{new Date(log.createdAt).toLocaleString()}</small>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function CallRoom({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  return (
    <div className="call-overlay">
      <section className="call-room">
        <header>
          <div><span className="live-dot" />Prototype call room</div>
          <button onClick={onClose} aria-label="Close call"><X /></button>
        </header>
        <div className="call-stage">
          <span className="call-avatar">{patient.name[0]}</span>
          <h2>{patient.name}</h2>
          <p>Ready to join · consented care context available</p>
        </div>
        <footer>
          <button><Video /></button>
          <button><MessageSquareText /></button>
          <button className="end-call" onClick={onClose}><Phone /></button>
        </footer>
        <p className="call-note">
          {isApiEnabled()
            ? 'Call UI only — no audio or video is transmitted. Care context can sync when the API is connected.'
            : 'No audio or video is transmitted in this frontend prototype.'}
        </p>
      </section>
    </div>
  );
}



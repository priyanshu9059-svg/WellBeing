'use client';

import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3, FileText, Headphones, LockKeyhole, LogOut, MessageSquareText, Phone, Search, ShieldCheck, UsersRound, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isApiEnabled } from '@/lib/api';
import { getServices, type AuthUser, type ProfessionalDashboard } from '@/services';

type Role = 'Counsellor' | 'Psychologist' | 'Psychiatrist';
type Patient = {
  id: string;
  name: string;
  score: number;
  level: string;
  signal: string;
  last: string;
  consent: string;
  mood: number[];
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

const demoPatients: Patient[] = [
  { id: 'P-2041', name: 'Anonymous 2041', score: 82, level: 'High', signal: 'Distress language increased', last: '8 min ago', consent: 'Care summary + contact', mood: [42, 51, 49, 64, 82] },
  { id: 'P-1837', name: 'Mira S.', score: 61, level: 'Elevated', signal: 'Low sleep, persistent worry', last: '22 min ago', consent: 'Care summary', mood: [48, 44, 57, 63, 61] },
  { id: 'P-1902', name: 'Anonymous 1902', score: 38, level: 'Moderate', signal: 'Work stress and isolation', last: '1 hr ago', consent: 'Care summary + contact', mood: [55, 49, 41, 36, 38] },
  { id: 'P-1755', name: 'Kabir R.', score: 19, level: 'Low', signal: 'Follow-up check-in', last: 'Yesterday', consent: 'Care summary', mood: [31, 27, 24, 22, 19] },
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

export function ProfessionalPortal() {
  const services = getServices();
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<Role>('Counsellor');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<ReturnType<typeof mapDashboard> | null>(null);
  const [usingDemo, setUsingDemo] = useState(true);

  async function loadDashboard(fallbackRole: Role, fallbackName?: string | null) {
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
    } catch {
      setUsingDemo(true);
      setDashboard({
        professionalName: fallbackName || 'Dr. Aditi Sharma',
        role: fallbackRole,
        metrics: demoMetrics,
        patients: demoPatients,
        queries: demoQueries,
        appointments: demoAppointments,
      });
    }
  }

  async function handleEnter(authUser?: AuthUser | null) {
    setUser(authUser ?? null);
    setSignedIn(true);
    await loadDashboard(role, authUser?.displayName);
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
    setUsingDemo(true);
  }

  if (!signedIn || !dashboard) {
    return (
      <ProfessionalAccess
        mode={mode}
        setMode={setMode}
        role={role}
        setRole={setRole}
        onEnter={handleEnter}
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
}: {
  mode: 'login' | 'signup';
  setMode: (v: 'login' | 'signup') => void;
  role: Role;
  setRole: (r: Role) => void;
  onEnter: (user?: AuthUser | null) => void | Promise<void>;
}) {
  const services = getServices();
  const [email, setEmail] = useState(mode === 'login' ? 'demo@wellbeing.care' : '');
  const [password, setPassword] = useState(mode === 'login' ? 'prototype' : '');
  const [displayName, setDisplayName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'login') {
      setEmail((e) => e || 'demo@wellbeing.care');
      setPassword((p) => p || 'prototype');
    } else {
      setEmail('');
      setPassword('');
    }
    setError(null);
  }, [mode]);

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
        const result = await services.authentication.signIn(email, password);
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
        <p className="portal-disclaimer">Prototype only · No real patient or clinical data</p>
      </section>
      <Card className="auth-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
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
        <Button className="auth-submit" onClick={submit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? (isApiEnabled() ? 'Sign in' : 'Open demo dashboard') : isApiEnabled() ? 'Create account' : 'Create prototype account'} <ChevronRight />
        </Button>
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
  const [selected, setSelected] = useState(patients[0] || demoPatients[0]);
  const [resolved, setResolved] = useState<string[]>([]);
  const [call, setCall] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [apptList, setApptList] = useState(appointments);
  const [queryList, setQueryList] = useState(queries);

  useEffect(() => {
    setApptList(appointments);
  }, [appointments]);

  useEffect(() => {
    setQueryList(queries);
  }, [queries]);

  useEffect(() => {
    if (patients.length && !patients.find((p) => p.id === selected?.id)) {
      setSelected(patients[0]);
    }
  }, [patients, selected?.id]);

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
        setQueryList((list) => list.filter((q) => q.id !== id));
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
        setQueryList((list) => list.filter((q) => q.id !== id));
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
        setApptList((list) =>
          list.map((a) => (a.id === id ? { ...a, status: 'CONFIRMED' } : a)),
        );
        await onRefresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not confirm appointment.');
      }
      return;
    }
    setApptList((list) => list.map((a) => (a.id === id ? { ...a, status: 'CONFIRMED' } : a)));
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
            <button className="notification"><Bell /><span>{Math.min(openQueryCount, 9)}</span></button>
          </div>
        </header>
        {section === 'Overview' && (
          <Overview
            metrics={metrics}
            patients={patients}
            selected={selected}
            setSelected={setSelected}
            setCall={setCall}
          />
        )}
        {section === 'Care queue' && (
          <CareQueue patients={filtered} selected={selected} setSelected={setSelected} setCall={setCall} />
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

function PatientPanel({ patient, setCall }: { patient: Patient; setCall: (p: Patient) => void }) {
  return (
    <Card className="patient-panel">
      <div className="patient-panel-head">
        <span className="patient-avatar large">{patient.name[0]}</span>
        <div>
          <small>{patient.id}</small>
          <h2>{patient.name}</h2>
          <span className="consent-pill"><Check />Consent: {patient.consent}</span>
        </div>
        <RiskBadge patient={patient} />
      </div>
      <div className="signal-callout">
        <Activity />
        <div>
          <b>Current care signal</b>
          <p>{patient.signal}. Review the conversation summary and use clinical judgment.</p>
        </div>
      </div>
      <div className="signal-chart">
        <div className="chart-label">
          <span>Recent support signal</span>
          <small>Last 5 check-ins</small>
        </div>
        <div className="spark-bars">
          {patient.mood.map((n, i) => (
            <i key={i} style={{ height: `${n}%` }}><span>{n}</span></i>
          ))}
        </div>
      </div>
      <div className="patient-actions">
        <Button onClick={() => setCall(patient)}><Video />Start call</Button>
        <Button variant="secondary"><FileText />Open summary</Button>
        <Button variant="ghost"><MessageSquareText />Message</Button>
      </div>
      <p className="fine-print">This prototype score is illustrative, non-diagnostic, and never replaces clinical assessment or emergency protocol.</p>
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
  return (
    <Card className="queries-card">
      <p className="kicker">Care team activity</p>
      <h2>Recent updates</h2>
      <div className="update-timeline">
        <article>
          <span><Activity /></span>
          <div>
            <b>Patient signal updated</b>
            <p>Anonymous 2041 moved from elevated to high. Manual review requested.</p>
            <small>8 minutes ago</small>
          </div>
        </article>
        <article>
          <span><CalendarDays /></span>
          <div>
            <b>Appointment confirmed</b>
            <p>Mira S. confirmed a video consultation for Friday at 11:00 AM.</p>
            <small>34 minutes ago</small>
          </div>
        </article>
        <article>
          <span><Check /></span>
          <div>
            <b>Query resolved</b>
            <p>Care coordinator shared the requested grounding resources.</p>
            <small>2 hours ago</small>
          </div>
        </article>
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

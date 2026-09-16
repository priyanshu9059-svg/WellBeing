'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { aggregateData, sampleCodes } from '@/mocks/data';
import { isApiEnabled } from '@/lib/api';
import { getServices } from '@/services';

type AggregatePoint = { name: string; value: number };

type AggregatesResponse = {
  hidden?: boolean;
  reason?: string;
  minGroupSize?: number;
  groupSize?: number;
  name?: string;
  aggregates?: Array<{ label: string; value: number; groupSize: number }>;
};

export function AccessCode() {
  const services = getServices();
  const [code, setCode] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function validate() {
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (!isApiEnabled()) {
      setStatus(sampleCodes[normalized] ? 'valid' : 'invalid');
      return;
    }
    setBusy(true);
    try {
      const result = await services.organization.validateCode(normalized, age);
      setStatus(result.valid ? 'valid' : 'invalid');
    } catch (e) {
      // Fall back to known demo codes if API call fails
      if (sampleCodes[normalized]) {
        setStatus('valid');
      } else {
        setStatus('invalid');
        setError(e instanceof Error ? e.message : 'Could not validate code.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow-page">
      <Card className="access-card">
        <div className="icon-orb"><Building2 /></div>
        <p className="kicker">Optional organization access</p>
        <h2>Enter a campus or organization code</h2>
        <p>
          Your code can unlock a demo experience without identifying you. We do not ask for a name, roll number,
          employee ID, or personal email.
        </p>
        <label className="field">
          <span>Organization or campus code</span>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setStatus('idle');
              setError(null);
            }}
            placeholder="Try CAMPUS-DEMO"
          />
          <small>Demo codes: CAMPUS-DEMO or TEAM-CARE</small>
        </label>
        <label className="field">
          <span>Age-band declaration</span>
          <select value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">Choose an age band</option>
            <option>Under 18</option>
            <option>18–24</option>
            <option>25–34</option>
            <option>35–44</option>
            <option>45+</option>
          </select>
          <small>Your full date of birth is not retained.</small>
        </label>
        {status === 'valid' && (
          <p className="success-box"><CheckCircle2 />Code accepted. You can continue anonymously.</p>
        )}
        {status === 'invalid' && (
          <p className="error-text">That demo code was not recognized. You can continue without one.</p>
        )}
        {error && <p className="error-text">{error}</p>}
        <div className="row">
          <Button onClick={validate} disabled={!code || !age || busy}>
            {busy ? 'Validating…' : isApiEnabled() ? 'Validate code' : 'Validate demo code'}
          </Button>
          {status === 'valid' && (
            <Link className="btn btn-secondary" href="/organization-demo">Enter anonymous demo</Link>
          )}
          <Link className="btn btn-ghost" href="/chat">Continue without code</Link>
        </div>
        <div className="privacy-box">
          <LockKeyhole />
          <p>
            <b>Anonymous entry</b>
            <br />
            Only the selected age band and demo organization state are stored locally.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function OrganizationDemo() {
  const services = getServices();
  const [cohort, setCohort] = useState('All cohorts');
  const [range, setRange] = useState('Last 30 days');
  const [chartData, setChartData] = useState<AggregatePoint[]>(aggregateData);
  const [hidden, setHidden] = useState(false);
  const [hiddenReason, setHiddenReason] = useState('Not enough data to show this group safely.');
  const [participants, setParticipants] = useState(128);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  const small = cohort === 'Small cohort' || hidden;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isApiEnabled() || !services.organization.aggregates) return;
      try {
        const raw = (await services.organization.aggregates('CAMPUS-DEMO')) as AggregatesResponse;
        if (cancelled) return;
        if (raw.hidden) {
          setHidden(true);
          setHiddenReason(raw.reason || 'Not enough data to show this group safely.');
          setLoadedFromApi(true);
          return;
        }
        setHidden(false);
        if (typeof raw.groupSize === 'number') setParticipants(raw.groupSize);
        if (raw.aggregates?.length) {
          setChartData(raw.aggregates.map((a) => ({ name: a.label, value: a.value })));
        }
        setLoadedFromApi(true);
      } catch {
        /* keep mock aggregateData */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="org-dashboard">
      <Card className="demo-banner">
        <Building2 />
        <div>
          <b>Demonstration dashboard</b>
          <p>
            {loadedFromApi
              ? 'Aggregate organization data from the support API. No individual conversations or records are shown.'
              : 'Mock aggregate data only. No individual conversations, records, or real alerts are shown.'}
          </p>
        </div>
      </Card>
      <div className="filter-bar">
        <label>
          Cohort
          <select
            value={cohort}
            onChange={(e) => {
              setCohort(e.target.value);
              if (e.target.value !== 'Small cohort' && loadedFromApi === false) setHidden(false);
            }}
          >
            <option>All cohorts</option>
            <option>First year</option>
            <option>Staff</option>
            <option>Small cohort</option>
          </select>
        </label>
        <label>
          Date range
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </label>
      </div>
      {small ? (
        <Card className="privacy-threshold">
          <LockKeyhole />
          <h2>{hiddenReason}</h2>
          <p>This demonstration hides aggregate results for groups with fewer than five mock participants.</p>
        </Card>
      ) : (
        <>
          <div className="metric-grid">
            <Card>
              <span>Active anonymous participants</span>
              <b>{participants}</b>
              <small>{loadedFromApi ? 'From organization API' : 'Mock count'} · {range}</small>
            </Card>
            <Card>
              <span>Average stress signal</span>
              <b>Moderate</b>
              <small>Non-clinical demo indicator</small>
            </Card>
            <Card>
              <span>Resource engagement</span>
              <b>64%</b>
              <small>Exercises and support pages</small>
            </Card>
            <Card>
              <span>Minimum group</span>
              <b>5+</b>
              <small>Privacy threshold active</small>
            </Card>
          </div>
          <div className="content-grid">
            <Card>
              <p className="kicker">Aggregate only</p>
              <h2>Common wellbeing themes</h2>
              <div className="chart">
                <ResponsiveContainer>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid stroke="#e8e5e1" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#777ea7" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <p className="kicker">Mock trend</p>
              <h2>Stress over time</h2>
              <div className="trend-list">
                {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, i) => (
                  <div key={w}>
                    <span>{w}</span>
                    <i><em style={{ width: `${[62, 58, 67, 54][i]}%` }} /></i>
                    <b>{['Elevated', 'Moderate', 'Elevated', 'Moderate'][i]}</b>
                  </div>
                ))}
              </div>
              <p className="fine-print">This dashboard does not generate or imply real crisis alerts.</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

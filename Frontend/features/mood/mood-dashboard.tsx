'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Plus } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { downloadJson, newId } from '@/lib/utils';
import { isApiEnabled } from '@/lib/api';
import { getServices } from '@/services';
import type { MoodEntry } from '@/types';

const moods = [
  { n: 1, e: '😞', l: 'Very low' },
  { n: 2, e: '😕', l: 'Low' },
  { n: 3, e: '😐', l: 'Okay' },
  { n: 4, e: '🙂', l: 'Good' },
  { n: 5, e: '😊', l: 'Very good' },
];
const tags = ['Sleep', 'Study', 'Work', 'Family', 'Relationships'];

function chartFromEntries(entries: MoodEntry[], mode: 'week' | 'month') {
  if (!entries.length) return [];
  if (mode === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7 = [...entries].slice(0, 14);
    const byDay: Record<string, number[]> = {};
    last7.forEach((e) => {
      const d = days[new Date(e.date).getDay()];
      byDay[d] = byDay[d] || [];
      byDay[d].push(e.mood);
    });
    return days.map((day) => ({
      day,
      mood: byDay[day]?.length ? byDay[day].reduce((a, b) => a + b, 0) / byDay[day].length : null,
    })).filter((x) => x.mood != null);
  }
  const weeks: Record<string, number[]> = {};
  entries.forEach((e) => {
    const d = new Date(e.date);
    const key = `W${Math.ceil(d.getDate() / 7)}`;
    weeks[key] = weeks[key] || [];
    weeks[key].push(e.mood);
  });
  return Object.entries(weeks).map(([week, vals]) => ({
    week,
    mood: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
}

export function MoodDashboard() {
  const services = getServices();
  const [entries, setEntries] = useLocalStorage<MoodEntry[]>('moods', []);
  const [mood, setMood] = useState(3);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isApiEnabled() || !services.mood.list) return;
    services.mood
      .list()
      .then((remote) => {
        if (remote.length) setEntries(remote);
      })
      .catch(() => {});
  }, []);

  async function save() {
    const local: MoodEntry = {
      id: newId(),
      date: new Date().toISOString(),
      mood,
      intensity,
      note,
      tags: selected,
    };
    if (isApiEnabled() && services.mood.create) {
      try {
        const created = await services.mood.create(local);
        setEntries((e) => [created, ...e]);
      } catch {
        setEntries((e) => [local, ...e]);
      }
    } else {
      setEntries((e) => [local, ...e]);
    }
    setNote('');
    setSelected([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const common = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.flatMap((e) => e.tags).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [entries]);

  const weekly = chartFromEntries(entries, 'week');
  const monthly = chartFromEntries(entries, 'month');

  return (
    <div className="content-grid">
      <Card className="checkin-card">
        <div className="card-heading">
          <div>
            <p className="kicker">Daily check-in</p>
            <h2>How are you feeling?</h2>
          </div>
          <span className="soft-icon">
            <CalendarDays />
          </span>
        </div>
        <div className="mood-options" role="radiogroup" aria-label="Mood">
          {moods.map((x) => (
            <button role="radio" aria-checked={mood === x.n} key={x.n} className={mood === x.n ? 'selected' : ''} onClick={() => setMood(x.n)}>
              <span>{x.e}</span>
              <small>{x.l}</small>
            </button>
          ))}
        </div>
        <label className="field">
          <span>
            How strong is this feeling? <b>{intensity}/10</b>
          </span>
          <input type="range" min="1" max="10" value={intensity} onChange={(e) => setIntensity(+e.target.value)} />
        </label>
        <label className="field">
          <span>
            A short note <small>(optional)</small>
          </span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What may have shaped today?" rows={3} />
        </label>
        <div className="tag-row">
          {tags.map((t) => (
            <button key={t} className={selected.includes(t) ? 'tag selected' : 'tag'} onClick={() => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}>
              {t}
            </button>
          ))}
        </div>
        <Button onClick={save}>
          <Plus size={18} /> Save check-in
        </Button>
        {saved && (
          <span className="success-text" role="status">
            {isApiEnabled() ? 'Saved to your account.' : 'Saved on this device.'}
          </span>
        )}
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <p className="kicker">Last 7 days</p>
            <h2>Weekly rhythm</h2>
          </div>
          <Button variant="ghost" onClick={() => downloadJson('wellbeing-mood-data.json', entries)}>
            <Download size={17} />
            Export JSON
          </Button>
        </div>
        <div className="chart">
          <ResponsiveContainer>
            <AreaChart data={weekly.length ? weekly : [{ day: '—', mood: 3 }]}>
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#777ea7" stopOpacity=".55" />
                  <stop offset="1" stopColor="#777ea7" stopOpacity=".02" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e8e5e1" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} hide />
              <Tooltip />
              <Area type="monotone" dataKey="mood" stroke="#626b99" strokeWidth={3} fill="url(#moodFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <p className="kicker">This month</p>
        <h2>Monthly trend</h2>
        <div className="chart small">
          <ResponsiveContainer>
            <LineChart data={monthly.length ? monthly : [{ week: 'W1', mood: 3 }]}>
              <CartesianGrid stroke="#e8e5e1" vertical={false} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} hide />
              <Tooltip />
              <Line type="monotone" dataKey="mood" stroke="#d4827d" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <p className="kicker">Patterns, not judgments</p>
        <h2>Common influences</h2>
        {entries.length === 0 ? (
          <div className="empty-state">
            <span>☁</span>
            <b>No patterns yet</b>
            <p>A few check-ins can help you notice what tends to make days harder or easier.</p>
          </div>
        ) : (
          <>
            <h3>Common triggers</h3>
            {common.map(([name, count]) => (
              <div className="summary-row" key={name}>
                <span>{name}</span>
                <b>
                  {count} check-in{count > 1 ? 's' : ''}
                </b>
              </div>
            ))}
            <h3>Helpful activity summary</h3>
            <p className="muted">Good-rest and gentle-movement tags will appear here as you add notes.</p>
          </>
        )}
      </Card>
      <Card className="span-two">
        <p className="kicker">Mood calendar</p>
        <h2>Your recent check-ins</h2>
        <div className="calendar-grid">
          {Array.from({ length: 28 }, (_, i) => {
            const entry = entries.find((e) => new Date(e.date).getDate() === i + 1);
            return (
              <div key={i} className={`calendar-day mood-${entry?.mood || 0}`}>
                <small>{i + 1}</small>
                <span>{entry ? moods.find((m) => m.n === entry.mood)?.e : '·'}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, IdCard, MapPin, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ensureSession, isApiEnabled } from '@/lib/api';
import { getCurrentLocalUser } from '@/lib/local-user-auth';
import { getServices, type UserProfileDetails } from '@/services';

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say', 'Self-describe'] as const;

const empty: UserProfileDetails = {
  location: '',
  abhaId: '',
  phone: '',
  gender: '',
  age: null,
  skipped: false,
};

type Mode = 'complete' | 'edit';

export function ProfileDetailsPage({ mode = 'edit' }: { mode?: Mode }) {
  const router = useRouter();
  const services = getServices();
  const [form, setForm] = useState<UserProfileDetails>(empty);
  const [customGender, setCustomGender] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [account, setAccount] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isApiEnabled()) await ensureSession();
        if (services.userProfile.getDetails) {
          const details = await services.userProfile.getDetails();
          if (cancelled) return;
          setForm({
            location: details.location || '',
            abhaId: details.abhaId || '',
            phone: details.phone || '',
            gender: details.gender || '',
            age: details.age,
            skipped: details.skipped,
            updatedAt: details.updatedAt,
          });
          if (details.gender && !GENDERS.includes(details.gender as (typeof GENDERS)[number])) {
            setCustomGender(details.gender);
            setForm((f) => ({ ...f, gender: 'Self-describe' }));
          }
        }
        let identity: { name?: string; email?: string } | null = null;
        if (isApiEnabled()) {
          const me = await services.authentication.me();
          if (me) identity = { name: me.displayName ?? undefined, email: me.email ?? undefined };
        } else {
          const local = getCurrentLocalUser();
          if (local) identity = { name: local.displayName, email: local.identifier };
        }
        if (!cancelled && identity) setAccount(identity);
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function genderValue() {
    return form.gender === 'Self-describe' ? customGender.trim() : form.gender;
  }

  async function save(skipped = false) {
    setBusy(true);
    setError('');
    setStatus('');
    const payload = {
      location: form.location.trim(),
      abhaId: form.abhaId.trim(),
      phone: form.phone.trim(),
      gender: genderValue(),
      age: form.age,
      skipped,
    };
    try {
      if (services.userProfile.saveDetails) {
        if (isApiEnabled()) await ensureSession();
        const saved = await services.userProfile.saveDetails(payload);
        setForm({ ...saved, gender: saved.gender || '' });
        setStatus(skipped ? 'Skipped for now. You can fill this anytime in Settings.' : 'Profile saved.');
      } else {
        localStorage.setItem('wellbeing-support:profile-details', JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }));
        setStatus(skipped ? 'Skipped for now.' : 'Saved on this device.');
      }
      if (mode === 'complete') {
        setTimeout(() => router.push('/support'), 600);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="narrow-page">
        <Card>
          <p className="kicker">Your details</p>
          <h2>Loading…</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="narrow-page">
      <Card className="access-card profile-details-card">
        <div className="icon-orb">
          <IdCard />
        </div>
        <p className="kicker">{mode === 'complete' ? 'Almost there · optional' : 'Your profile'}</p>
        <h2>{mode === 'complete' ? 'Add a few details if you want' : 'Edit your profile details'}</h2>
        {account && (
          <p className="signed-in-row fine-print">
            <UserRound size={14} /> Signed in as <b>{account.name || account.email}</b>
            {account.name && account.email ? ` · ${account.email}` : ''}
          </p>
        )}
        <p>
          Location, ABHA ID, phone, gender, and age help counsellors support you better when you consent to share.
          None of these fields are required{mode === 'complete' ? ' — you can skip and fill them later' : ''}.
        </p>

        <label className="field">
          <span>
            <MapPin size={14} /> Location
          </span>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="City / area (e.g. Indiranagar, Bengaluru)"
          />
        </label>

        <label className="field">
          <span>
            <IdCard size={14} /> ABHA ID
          </span>
          <input
            value={form.abhaId}
            onChange={(e) => setForm({ ...form, abhaId: e.target.value })}
            placeholder="14-digit ABHA number (optional)"
            inputMode="numeric"
          />
          <small>Ayushman Bharat Health Account — never required to use support tools.</small>
        </label>

        <label className="field">
          <span>
            <Phone size={14} /> Phone number
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 …"
          />
        </label>

        <div className="editor-row">
          <label className="field">
            <span>
              <UserRound size={14} /> Gender
            </span>
            <select
              value={GENDERS.includes(form.gender as (typeof GENDERS)[number]) ? form.gender : form.gender ? 'Self-describe' : ''}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Prefer not to answer</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Age</span>
            <input
              type="number"
              min={1}
              max={120}
              value={form.age ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  age: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="Years"
            />
          </label>
        </div>

        {form.gender === 'Self-describe' && (
          <label className="field">
            <span>How do you describe your gender?</span>
            <input value={customGender} onChange={(e) => setCustomGender(e.target.value)} placeholder="Your words" />
          </label>
        )}

        {error && <p className="error-text">{error}</p>}
        {status && (
          <p className="success-text" role="status">
            <Check size={16} /> {status}
          </p>
        )}

        <div className="row">
          <Button onClick={() => save(false)} disabled={busy}>
            {busy ? 'Saving…' : mode === 'complete' ? 'Save and continue' : 'Save changes'}
          </Button>
          {mode === 'complete' && (
            <Button variant="secondary" onClick={() => save(true)} disabled={busy}>
              Skip for now
            </Button>
          )}
          {mode === 'edit' && (
            <Link className="btn btn-ghost" href="/settings">
              Back to settings
            </Link>
          )}
        </div>

        {form.updatedAt && (
          <p className="fine-print">Last updated {new Date(form.updatedAt).toLocaleString()}</p>
        )}
      </Card>
    </div>
  );
}

'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, IdCard, MapPin, Pencil, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ensureSession, isApiEnabled } from '@/lib/api';
import { getServices, type AbhaProfileDto, type AuthUser, type UserProfileDetails } from '@/services';

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say', 'Self-describe'] as const;

const empty: UserProfileDetails = {
  location: '',
  abhaId: '',
  phone: '',
  gender: '',
  age: null,
  skipped: false,
};

type Mode = 'complete' | 'edit' | 'view';

function displayOrDash(value: string | number | null | undefined) {
  if (value == null) return 'Not provided';
  const text = String(value).trim();
  return text || 'Not provided';
}

export function ProfileDetailsPage({ mode = 'view' }: { mode?: Mode }) {
  const router = useRouter();
  const services = getServices();
  const [form, setForm] = useState<UserProfileDetails>(empty);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customGender, setCustomGender] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [abhaPreview, setAbhaPreview] = useState<AbhaProfileDto | null>(null);
  const [editing, setEditing] = useState(mode === 'complete' || mode === 'edit');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isApiEnabled()) await ensureSession();
        const me = await services.authentication.me();
        if (!cancelled) setUser(me);
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
            abhaVerified: details.abhaVerified,
            abhaVerifiedAt: details.abhaVerifiedAt,
            abhaProfile: details.abhaProfile,
          });
          if (details.abhaProfile && typeof details.abhaProfile === 'object') {
            setAbhaPreview(details.abhaProfile as unknown as AbhaProfileDto);
          }
          if (details.gender && !GENDERS.includes(details.gender as (typeof GENDERS)[number])) {
            setCustomGender(details.gender);
            setForm((f) => ({ ...f, gender: 'Self-describe' }));
          }
          if (mode === 'view') {
            const hasAny =
              Boolean(details.location?.trim()) ||
              Boolean(details.abhaId?.trim()) ||
              Boolean(details.phone?.trim()) ||
              Boolean(details.gender?.trim()) ||
              details.age != null;
            setEditing(!hasAny && Boolean(me && !me.anonymous));
          }
        }
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function fetchAbha(apply: boolean) {
    const id = form.abhaId.trim();
    if (!id) {
      setError('Enter a 14-digit ABHA number first.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (isApiEnabled()) await ensureSession();
      if (apply && services.userProfile.applyAbha) {
        const result = await services.userProfile.applyAbha(id);
        setAbhaPreview(result.profile);
        setForm({
          location: result.details.location || '',
          abhaId: result.details.abhaId || '',
          phone: result.details.phone || '',
          gender: result.details.gender || '',
          age: result.details.age,
          skipped: result.details.skipped,
          updatedAt: result.details.updatedAt,
          abhaVerified: result.details.abhaVerified,
          abhaVerifiedAt: result.details.abhaVerifiedAt,
          abhaProfile: result.details.abhaProfile,
        });
        setStatus(`ABHA details applied (${result.profile.source}).`);
      } else if (services.userProfile.lookupAbha) {
        const profile = await services.userProfile.lookupAbha(id);
        setAbhaPreview(profile);
        setStatus(`ABHA found via ${profile.source} lookup.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ABHA lookup failed.');
    } finally {
      setBusy(false);
    }
  }

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
      } else {
        setEditing(false);
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

  const signedIn = Boolean(user && !user.anonymous);
  const displayName = user?.displayName?.trim() || user?.email || 'Your profile';
  const genderLabel = form.gender === 'Self-describe' ? customGender || form.gender : form.gender;
  const abhaName =
    abhaPreview?.name ||
    (form.abhaProfile && typeof form.abhaProfile.name === 'string' ? form.abhaProfile.name : '');

  if (!editing && mode !== 'complete') {
    return (
      <div className="narrow-page profile-view-page">
        <Card className="access-card profile-view-card">
          <div className="profile-view-hero">
            <div className="profile-view-avatar" aria-hidden="true">
              {(displayName.match(/\b\w/g) || ['?']).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <p className="kicker">{signedIn ? 'Signed-in profile' : 'Browsing anonymously'}</p>
              <h2>{displayName}</h2>
              {user?.email && <p className="profile-view-email">{user.email}</p>}
              {!signedIn && (
                <p>
                  Sign up to save a named profile.{' '}
                  <Link href="/signup">Create an account</Link>
                </p>
              )}
            </div>
          </div>

          <dl className="profile-view-grid">
            <div>
              <dt>Location</dt>
              <dd>{displayOrDash(form.location)}</dd>
            </div>
            <div>
              <dt>ABHA ID</dt>
              <dd>
                {displayOrDash(form.abhaId)}
                {form.abhaVerified ? <span className="abha-verified-inline">Verified</span> : null}
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{displayOrDash(form.phone)}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{displayOrDash(genderLabel)}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{displayOrDash(form.age)}</dd>
            </div>
            {abhaName ? (
              <div>
                <dt>ABHA name</dt>
                <dd>{abhaName}</dd>
              </div>
            ) : null}
          </dl>

          {abhaPreview && (
            <div className="abha-preview">
              <b>{abhaPreview.name}</b>
              <span>
                {abhaPreview.abhaNumberFormatted} · {abhaPreview.status}
              </span>
              <span>
                {[abhaPreview.gender, abhaPreview.dateOfBirth, abhaPreview.district, abhaPreview.state]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          )}

          <div className="row profile-view-actions">
            <Button onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit profile
            </Button>
            {form.location.trim() ? (
              <Link className="btn btn-secondary" href="/consultancy">
                <MapPin size={16} /> Find care near {form.location.trim()}
              </Link>
            ) : (
              <Link className="btn btn-secondary" href="/consultancy">
                <MapPin size={16} /> Find nearby care
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

  return (
    <div className="narrow-page">
      <Card className="access-card profile-details-card">
        <div className="icon-orb">
          <IdCard />
        </div>
        <p className="kicker">{mode === 'complete' ? 'Almost there · optional' : 'Your profile'}</p>
        <h2>{mode === 'complete' ? 'Add a few details if you want' : 'Edit your profile details'}</h2>
        <p>
          Location, ABHA ID, phone, gender, and age help counsellors support you better when you consent to share.
          None of these fields are required{mode === 'complete' ? ' — you can skip and fill them later' : ''}.
          Your location is also used to centre Find care maps.
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
          <small>Ayushman Bharat Health Account — fetch official details when available.</small>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !form.abhaId.trim()}
              onClick={() => void fetchAbha(false)}
            >
              Look up ABHA
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !form.abhaId.trim()}
              onClick={() => void fetchAbha(true)}
            >
              Fetch &amp; apply to profile
            </Button>
          </div>
          {form.abhaVerified && (
            <small className="abha-verified">
              ABHA verified{form.abhaVerifiedAt ? ` · ${new Date(form.abhaVerifiedAt).toLocaleString()}` : ''}
            </small>
          )}
          {abhaPreview && (
            <div className="abha-preview">
              <b>{abhaPreview.name}</b>
              <span>
                {abhaPreview.abhaNumberFormatted} · {abhaPreview.status}
              </span>
              <span>
                {[abhaPreview.gender, abhaPreview.dateOfBirth, abhaPreview.district, abhaPreview.state]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span>
                Source: {abhaPreview.source === 'live' ? 'ABDM API' : 'Demo lookup (set ABHA_CLIENT_ID for live)'}
              </span>
            </div>
          )}
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
          {mode !== 'complete' && (
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>

        {form.updatedAt && (
          <p className="fine-print">Last updated {new Date(form.updatedAt).toLocaleString()}</p>
        )}
      </Card>
    </div>
  );
}

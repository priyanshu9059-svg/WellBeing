/**
 * ABHA (Ayushman Bharat Health Account) integration.
 * Live mode uses ABDM sandbox/production when client credentials are set.
 * Demo mode validates format and returns a deterministic profile for prototypes.
 */

export type AbhaProfile = {
  abhaNumber: string;
  abhaNumberFormatted: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  status: string;
  source: 'live' | 'demo';
  verified: boolean;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function formatAbha(digits: string) {
  const d = digitsOnly(digits);
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10, 14)}`;
}

export function validateAbhaNumber(raw: string): { ok: true; digits: string } | { ok: false; error: string } {
  const digits = digitsOnly(raw);
  if (digits.length !== 14) {
    return { ok: false, error: 'ABHA number must be 14 digits (e.g. 12-3456-7890-1234).' };
  }
  return { ok: true, digits };
}

function demoProfile(digits: string): AbhaProfile {
  const n = Number(digits.slice(-4)) || 1000;
  const genders = ['F', 'M', 'O'];
  const states = ['Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Uttar Pradesh'];
  const districts = ['Bengaluru Urban', 'Pune', 'New Delhi', 'Chennai', 'Lucknow'];
  const first = ['Asha', 'Ravi', 'Meera', 'Kabir', 'Ananya'];
  const last = ['Sharma', 'Patel', 'Singh', 'Nair', 'Das'];
  const i = n % 5;
  return {
    abhaNumber: digits,
    abhaNumberFormatted: formatAbha(digits),
    name: `${first[i]} ${last[(n >> 2) % 5]}`,
    gender: genders[n % 3],
    dateOfBirth: `${1975 + (n % 30)}-${String((n % 12) + 1).padStart(2, '0')}-15`,
    mobile: `+91 9${String(n).padStart(9, '0').slice(0, 9)}`,
    email: null,
    address: `Ward ${(n % 40) + 1}, ${districts[i]}`,
    district: districts[i],
    state: states[i],
    status: 'ACTIVE',
    source: 'demo',
    verified: true,
  };
}

async function getGatewayToken(): Promise<string | null> {
  const clientId = process.env.ABHA_CLIENT_ID?.trim();
  const clientSecret = process.env.ABHA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const sessionUrl =
    process.env.ABHA_SESSION_URL?.trim() ||
    'https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions';

  const res = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'REQUEST-ID': crypto.randomUUID(),
      TIMESTAMP: new Date().toISOString(),
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
      grantType: 'client_credentials',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ABHA session failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as { accessToken?: string; token?: string };
  return data.accessToken || data.token || null;
}

async function liveLookup(digits: string): Promise<AbhaProfile> {
  const token = await getGatewayToken();
  if (!token) throw new Error('ABHA credentials not configured');

  const base =
    process.env.ABHA_API_BASE?.trim() || 'https://abhasbx.abdm.gov.in/abha/api';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'REQUEST-ID': crypto.randomUUID(),
    TIMESTAMP: new Date().toISOString(),
  };

  // Prefer public search / profile endpoints when available in sandbox
  const searchRes = await fetch(`${base}/v3/profile/account/abha/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      scope: ['search-abha'],
      abhaNumber: digits,
    }),
  });

  if (searchRes.ok) {
    const data = (await searchRes.json()) as Record<string, unknown>;
    const profile = (data.ABHAProfile || data.profile || data) as Record<string, unknown>;
    return {
      abhaNumber: digits,
      abhaNumberFormatted: formatAbha(String(profile.ABHANumber || profile.abhaNumber || digits)),
      name: String(profile.name || profile.fullName || 'ABHA holder'),
      gender: String(profile.gender || ''),
      dateOfBirth: (profile.dateOfBirth || profile.dob || null) as string | null,
      mobile: (profile.mobile || profile.phone || null) as string | null,
      email: (profile.email || null) as string | null,
      address: (profile.address || profile.villageTownCity || null) as string | null,
      district: (profile.districtName || profile.district || null) as string | null,
      state: (profile.stateName || profile.state || null) as string | null,
      status: String(profile.status || 'ACTIVE'),
      source: 'live',
      verified: true,
    };
  }

  const detail = await searchRes.text().catch(() => '');
  throw new Error(`ABHA lookup failed (${searchRes.status}): ${detail || searchRes.statusText}`);
}

export async function lookupAbha(raw: string): Promise<AbhaProfile> {
  const validated = validateAbhaNumber(raw);
  if (!validated.ok) throw new Error(validated.error);

  const mode = (process.env.ABHA_MODE || 'demo').toLowerCase();
  const hasCreds = Boolean(process.env.ABHA_CLIENT_ID?.trim() && process.env.ABHA_CLIENT_SECRET?.trim());

  if (mode === 'live' || (mode !== 'demo' && hasCreds)) {
    try {
      return await liveLookup(validated.digits);
    } catch (err) {
      if (mode === 'live') throw err;
      console.warn('ABHA live lookup failed, falling back to demo:', (err as Error).message);
    }
  }

  return demoProfile(validated.digits);
}

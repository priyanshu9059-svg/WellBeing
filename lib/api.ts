const TOKEN_KEY = 'wellbeing-support:auth-token';
const ANON_KEY = 'wellbeing-support:anonymous-key';

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBaseUrl());
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAnonymousKey(): string {
  if (typeof window === 'undefined') return '';
  let key = localStorage.getItem(ANON_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, key);
  }
  return key;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  responseType?: 'json' | 'blob';
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new ApiError(0, 'API base URL is not configured.');

  const headers: Record<string, string> = { Accept: 'application/json' };
  const rawBody = typeof Blob !== 'undefined' && options.body instanceof Blob;
  if (options.body !== undefined && !rawBody) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? (rawBody ? options.body as Blob : JSON.stringify(options.body)) : undefined,
    signal: options.signal,
  });

  if (res.status === 204) return undefined as T;
  if (options.responseType === 'blob') return (await res.blob()) as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

let ensureSessionPromise: Promise<string> | null = null;

/** Ensures an anonymous or existing session token is available. */
export async function ensureSession(signal?: AbortSignal): Promise<string> {
  const existing = getToken();
  if (existing) return existing;
  if (!isApiEnabled()) throw new ApiError(0, 'API not configured');

  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const data = await apiFetch<{ token: string; anonymousKey?: string }>('/api/auth/anonymous', {
        method: 'POST',
        body: { anonymousKey: getAnonymousKey() },
        auth: false,
        signal,
      });
      setToken(data.token);
      if (data.anonymousKey && typeof window !== 'undefined') {
        localStorage.setItem(ANON_KEY, data.anonymousKey);
      }
      return data.token;
    })().finally(() => {
      ensureSessionPromise = null;
    });
  }
  return ensureSessionPromise;
}

export async function apiAuthed<T>(path: string, options: RequestOptions = {}): Promise<T> {
  await ensureSession(options.signal);
  try {
    return await apiFetch<T>(path, { ...options, auth: true });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      setToken(null);
      await ensureSession(options.signal);
      return apiFetch<T>(path, { ...options, auth: true });
    }
    throw e;
  }
}

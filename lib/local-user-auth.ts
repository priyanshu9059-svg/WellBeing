const ACCOUNTS_KEY = 'wellbeing-support:user-accounts';
const CURRENT_USER_KEY = 'wellbeing-support:current-user';

type StoredAccount = {
  id: string;
  displayName: string;
  identifier: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type LocalUser = {
  id: string;
  displayName: string;
  identifier: string;
  signedInAt: string;
};

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function loadAccounts(): StoredAccount[] {
  try {
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? parsed as StoredAccount[] : [];
  } catch {
    return [];
  }
}

async function hashPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

function saveCurrentUser(account: StoredAccount): LocalUser {
  const user = {
    id: account.id,
    displayName: account.displayName,
    identifier: account.identifier,
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('wellbeing-support:auth-changed', { detail: user }));
  return user;
}

export async function createLocalUser(input: { displayName: string; identifier: string; password: string }) {
  const displayName = input.displayName.trim();
  const identifier = normalizeIdentifier(input.identifier);
  if (!displayName) throw new Error('Enter your full name.');
  if (!identifier) throw new Error('Enter an email address or mobile number.');
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters.');

  const accounts = loadAccounts();
  if (accounts.some((account) => account.identifier === identifier)) {
    throw new Error('An account already exists for this email or mobile number. Log in instead.');
  }

  const salt = crypto.randomUUID();
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    displayName,
    identifier,
    passwordHash: await hashPassword(input.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  return saveCurrentUser(account);
}

export async function signInLocalUser(identifierValue: string, password: string) {
  const identifier = normalizeIdentifier(identifierValue);
  if (!identifier || !password) throw new Error('Enter your email or mobile number and password.');
  const account = loadAccounts().find((item) => item.identifier === identifier);
  if (!account) throw new Error('No account was found. Check your details or sign up first.');
  const passwordHash = await hashPassword(password, account.salt);
  if (passwordHash !== account.passwordHash) throw new Error('The password is incorrect.');
  return saveCurrentUser(account);
}

export function getCurrentLocalUser(): LocalUser | null {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    return saved ? JSON.parse(saved) as LocalUser : null;
  } catch {
    return null;
  }
}

export function signOutLocalUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.dispatchEvent(new CustomEvent('wellbeing-support:auth-changed'));
}

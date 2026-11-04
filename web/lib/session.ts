import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  canonicalIp,
  cookieHeader,
  exactAllowlist,
  isCouncilAdmin,
  readSessionToken,
} from '@shared/intel-session.mjs';

export { cookieHeader, isCouncilAdmin };

export function sessionSecret() {
  return process.env.SESSION_SECRET || '';
}

export function allowlist() {
  return exactAllowlist(process.env.ALLOWLIST_EMAILS);
}

export function ipFromHeaders(get: (name: string) => string | null) {
  const marked = get('x-intel-ip') || '';
  const forwarded = get('x-forwarded-for') || '';
  const raw = marked || forwarded.split(',')[0] || '';
  return canonicalIp(raw);
}

export function readRequestSession() {
  const secret = sessionSecret();
  if (secret.length < 32) return null;
  let list: Set<string>;
  try {
    list = allowlist();
  } catch {
    return null;
  }
  const headerStore = headers();
  const ip = ipFromHeaders((name) => headerStore.get(name));
  if (!ip) return null;
  const token = cookies().get('intel_session')?.value || '';
  return readSessionToken({
    cookieHeader: token ? `intel_session=${token}` : '',
    secret,
    allowlist: list,
    nowMs: Date.now(),
    ip,
  });
}

export function requireSession() {
  const session = readRequestSession();
  if (!session) redirect('/login');
  return session;
}

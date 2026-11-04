import { createHmac, timingSafeEqual } from 'node:crypto';
export { canonicalIp } from './ip.mjs';

export const COOKIE = 'intel_session';

export const ADMIN_EMAIL = 'bjljohnson2012@gmail.com';

export const ALLOWED_EMAILS = Object.freeze([
  'bjljohnson2012@gmail.com',
  'alexander.varden@gmail.com',
]);

/** Hard stop. Do not raise these. The window is one hour. */
export const LIMITS = {
  codeTtlMs: 5 * 60 * 1000,
  sessionTtlSec: 7 * 24 * 60 * 60,
  cooldownMs: 60 * 1000,
  requestPerEmail: 20,
  requestPerIp: 20,
  requestWindowMs: 60 * 60 * 1000,
  verifyPerEmail: 8,
  verifyPerIp: 30,
  verifyWindowMs: 15 * 60 * 1000,
  askPerEmail: 30,
  askWindowMs: 60 * 60 * 1000,
  maxAttempts: 5,
};

export const ASK_MIN_SCORE = 0.72;

export function parseAllowlist(value) {
  return new Set(String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

export function exactAllowlist(value) {
  const allowlist = parseAllowlist(value);
  const expected = new Set(ALLOWED_EMAILS);
  const same = allowlist.size === expected.size && [...expected].every((email) => allowlist.has(email));
  if (!same) {
    throw new Error('ALLOWLIST_EMAILS must be exactly bjljohnson2012@gmail.com and alexander.varden@gmail.com');
  }
  return allowlist;
}

export function isCouncilAdmin(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL;
}

export function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function signSession(email, exp, ip, secret) {
  const payload = b64url(JSON.stringify({ email, exp, ip }));
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function tokenFromCookie(cookieHeader) {
  const raw = String(cookieHeader || '');
  let token = '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === COOKIE) token = rest.join('=');
  }
  return token;
}

export function readSessionToken({ cookieHeader: header, secret, allowlist, nowMs, ip }) {
  const token = tokenFromCookie(header);
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest();
  let got;
  try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!data || typeof data.email !== 'string' || typeof data.exp !== 'number') return null;
  if (typeof data.ip !== 'string' || data.ip !== ip) return null;
  if (data.exp * 1000 <= nowMs) return null;
  if (!allowlist.has(data.email)) return null;
  return { email: data.email };
}

export function waitMs(buckets, key, limit, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now || rec.count < limit) return 0;
  return rec.resetAt - now;
}

export function bump(buckets, key, windowMs, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else rec.count += 1;
}

export function rateLimitMessage(kind, retryAfterSec) {
  switch (kind) {
    case 'cooldown':
      return 'Wait about a minute, then request a new code.';
    case 'window': {
      const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
      const unit = minutes === 1 ? 'minute' : 'minutes';
      return `Too many codes for now. Try again in about ${minutes} ${unit}.`;
    }
    default: {
      const unknown = kind;
      throw new Error(`Unknown rate limit: ${unknown}`);
    }
  }
}

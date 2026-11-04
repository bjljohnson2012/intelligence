import { createHmac, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const loginHtml = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'login.html'), 'utf8');

export const LIMITS = {
  codeTtlMs: 10 * 60 * 1000,
  sessionTtlSec: 7 * 24 * 60 * 60,
  cooldownMs: 60 * 1000,
  requestPerEmail: 3,
  requestPerIp: 10,
  requestWindowMs: 60 * 60 * 1000,
  verifyPerEmail: 8,
  verifyPerIp: 30,
  verifyWindowMs: 15 * 60 * 1000,
  maxAttempts: 5,
};

const COOKIE = 'intel_session';
const GENERIC = { ok: true };
const DUMMY_SALT = Buffer.alloc(16, 7);
const DUMMY_HASH = scryptSync('000000', DUMMY_SALT, 32);

export const ALLOWED_EMAILS = Object.freeze([
  'bjljohnson2012@gmail.com',
  'alexander.varden@gmail.com',
]);

function parseAllowlist(value) {
  return new Set(String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function exactAllowlist(value) {
  const allowlist = parseAllowlist(value);
  const expected = new Set(ALLOWED_EMAILS);
  const same = allowlist.size === expected.size && [...expected].every((email) => allowlist.has(email));
  if (!same) {
    throw new Error('ALLOWLIST_EMAILS must be exactly bjljohnson2012@gmail.com and alexander.varden@gmail.com');
  }
  return allowlist;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function hashCode(code, salt) {
  return scryptSync(String(code), salt, 32);
}

function mintCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signSession(email, exp, secret) {
  const payload = b64url(JSON.stringify({ email, exp }));
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function readSession(req, secret, allowlist, now) {
  const raw = req.headers.cookie || '';
  let token = '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === COOKIE) token = rest.join('=');
  }
  if (!token) return null;
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
  if (data.exp * 1000 <= now()) return null;
  if (!allowlist.has(data.email)) return null;
  return { email: data.email };
}

function writeCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

function refused(res) {
  res.set('Cache-Control', 'no-store');
  return res.status(401).json({ status: 'refused', unknownReason: 'Sign-in required' });
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.get('host'); } catch { return false; }
}

function limited(buckets, key, limit, windowMs, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now) return false;
  return rec.count >= limit;
}

function bump(buckets, key, windowMs, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else rec.count += 1;
}

export function createApp({ env, sendEmail, distDir, now = () => Date.now() }) {
  const secret = env.SESSION_SECRET || '';
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const allowlist = exactAllowlist(env.ALLOWLIST_EMAILS);
  const codes = new Map();
  const buckets = new Map();
  const lastSent = new Map();

  function sweep(t) {
    for (const [key, rec] of codes) if (rec.expiresAt <= t) codes.delete(key);
    for (const [key, rec] of buckets) if (rec.resetAt <= t) buckets.delete(key);
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  app.get('/login', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (readSession(req, secret, allowlist, now)) return res.redirect(302, '/');
    res.type('html').send(loginHtml);
  });

  app.post('/api/auth/request-code', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!sameOrigin(req)) return res.status(400).json({ ok: false });
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok: false });
    const t = now();
    sweep(t);
    const ip = clientIp(req);
    const over = limited(buckets, `req:${email}`, LIMITS.requestPerEmail, LIMITS.requestWindowMs, t)
      || limited(buckets, `reqip:${ip}`, LIMITS.requestPerIp, LIMITS.requestWindowMs, t)
      || ((lastSent.get(email) || 0) + LIMITS.cooldownMs > t);
    if (over) return res.status(429).json({ ok: false, message: 'Too many tries. Wait a minute and try again.' });
    bump(buckets, `req:${email}`, LIMITS.requestWindowMs, t);
    bump(buckets, `reqip:${ip}`, LIMITS.requestWindowMs, t);
    lastSent.set(email, t);
    if (allowlist.has(email)) {
      const code = mintCode();
      const salt = randomBytes(16);
      codes.set(email, {
        hash: hashCode(code, salt),
        salt,
        expiresAt: t + LIMITS.codeTtlMs,
        attempts: 0,
      });
      let delivered = false;
      try {
        const result = await sendEmail({
          to: email,
          code,
          idempotencyKey: `sign-in-code/${randomUUID()}`,
        });
        delivered = result == null || result.ok !== false;
      } catch {
        console.error('sign-in email failed');
      }
      if (!delivered) codes.delete(email);
    }
    return res.status(200).json(GENERIC);
  });

  app.post('/api/auth/verify', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!sameOrigin(req)) return refused(res);
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) return refused(res);
    const t = now();
    sweep(t);
    const ip = clientIp(req);
    if (limited(buckets, `ver:${email}`, LIMITS.verifyPerEmail, LIMITS.verifyWindowMs, t)
      || limited(buckets, `verip:${ip}`, LIMITS.verifyPerIp, LIMITS.verifyWindowMs, t)) {
      return res.status(429).json({ ok: false, message: 'Too many tries. Wait a minute and try again.' });
    }
    bump(buckets, `ver:${email}`, LIMITS.verifyWindowMs, t);
    bump(buckets, `verip:${ip}`, LIMITS.verifyWindowMs, t);
    const rec = codes.get(email);
    const actual = hashCode(code, rec?.salt || DUMMY_SALT);
    const expected = rec?.hash || DUMMY_HASH;
    const equal = actual.length === expected.length && timingSafeEqual(actual, expected);
    if (!rec || rec.expiresAt <= t) return refused(res);
    rec.attempts += 1;
    if (!equal || rec.attempts > LIMITS.maxAttempts) {
      if (rec.attempts >= LIMITS.maxAttempts) codes.delete(email);
      return refused(res);
    }
    codes.delete(email);
    const exp = Math.floor(t / 1000) + LIMITS.sessionTtlSec;
    writeCookie(res, signSession(email, exp, secret), LIMITS.sessionTtlSec);
    return res.json({ ok: true, email });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.set('Cache-Control', 'no-store');
    writeCookie(res, '', 0);
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = readSession(req, secret, allowlist, now);
    if (!session) return refused(res);
    return res.json({ email: session.email });
  });

  app.use((req, res, next) => {
    if (readSession(req, secret, allowlist, now)) {
      res.set('Cache-Control', 'private, no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      return next();
    }
    if (req.path.startsWith('/api/')) return refused(res);
    return res.redirect(302, '/login');
  });

  app.post('/api/ask', (_req, res) => refused(res));
  app.use('/api', (_req, res) => refused(res));

  app.use(express.static(distDir, { index: false, fallthrough: true, dotfiles: 'deny' }));
  app.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(404).type('text').send('Not found');
    }
    const indexPath = path.join(distDir, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) res.status(503).type('html').send('<!doctype html><title>Not ready</title><p>The plan is not built yet.</p>');
    });
  });

  return app;
}

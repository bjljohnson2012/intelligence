import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LIMITS, rateLimitMessage, signSession } from './intel-session.mjs';

const DUMMY_SALT = Buffer.alloc(16, 7);
const DUMMY_HASH = scryptSync('000000', DUMMY_SALT, 32);
const GENERIC = { ok: true };

export function normalizeEmail(value) {
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

function emptyState() {
  return { codes: new Map(), buckets: new Map(), lastSent: new Map() };
}

function hydrate(parsed) {
  const state = emptyState();
  for (const [email, rec] of Object.entries(parsed.codes || {})) {
    state.codes.set(email, {
      hash: Buffer.from(rec.hash, 'base64'),
      salt: Buffer.from(rec.salt, 'base64'),
      expiresAt: rec.expiresAt,
      attempts: rec.attempts,
    });
  }
  for (const [key, rec] of Object.entries(parsed.buckets || {})) state.buckets.set(key, rec);
  for (const [email, sent] of Object.entries(parsed.lastSent || {})) state.lastSent.set(email, sent);
  return state;
}

function dehydrate(state) {
  const codes = {};
  for (const [email, rec] of state.codes) {
    codes[email] = {
      hash: Buffer.from(rec.hash).toString('base64'),
      salt: Buffer.from(rec.salt).toString('base64'),
      expiresAt: rec.expiresAt,
      attempts: rec.attempts,
    };
  }
  return {
    codes,
    buckets: Object.fromEntries(state.buckets),
    lastSent: Object.fromEntries(state.lastSent),
  };
}

export function createMemoryStore() {
  const state = emptyState();
  return {
    async update(fn) {
      return fn(state);
    },
  };
}

export function createFileStore(file) {
  let chain = Promise.resolve();
  const lock = (fn) => {
    const run = chain.then(() => fn());
    chain = run.then(() => {}, () => {});
    return run;
  };
  return {
    async update(fn) {
      return lock(async () => {
        let parsed = {};
        try {
          parsed = JSON.parse(await readFile(file, 'utf8'));
        } catch {
          parsed = {};
        }
        const state = hydrate(parsed);
        const result = await fn(state);
        await mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(dehydrate(state)));
        await rename(tmp, file);
        return result;
      });
    },
  };
}

function sweep(state, t) {
  for (const [key, rec] of state.codes) if (rec.expiresAt <= t) state.codes.delete(key);
  for (const [key, rec] of state.buckets) if (rec.resetAt <= t) state.buckets.delete(key);
}

function tooMany(wait, kind) {
  const retryAfterSec = Math.max(1, Math.ceil(wait / 1000));
  return {
    status: 429,
    body: {
      ok: false,
      message: rateLimitMessage(kind, retryAfterSec),
      retryAfterSec,
      limit: kind,
    },
    retryAfterSec,
  };
}

function waitOf(buckets, key, limit, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now || rec.count < limit) return 0;
  return rec.resetAt - now;
}

function bumpOf(buckets, key, windowMs, now) {
  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else rec.count += 1;
}

const refused = { status: 401, body: { status: 'refused', unknownReason: 'Sign-in required' } };

export async function requestCode(store, { email, ip, now, allowlist, sendEmail }) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { status: 400, body: { ok: false } };
  return store.update(async (state) => {
    const t = now();
    sweep(state, t);
    const rateIp = ip || 'unknown';
    const windowWait = Math.max(
      waitOf(state.buckets, `req:${normalized}`, LIMITS.requestPerEmail, t),
      waitOf(state.buckets, `reqip:${rateIp}`, LIMITS.requestPerIp, t),
    );
    const coolWait = Math.max(0, (state.lastSent.get(normalized) || 0) + LIMITS.cooldownMs - t);
    if (windowWait > 0) return tooMany(Math.max(windowWait, coolWait), 'window');
    if (coolWait > 0) return tooMany(coolWait, 'cooldown');
    bumpOf(state.buckets, `req:${normalized}`, LIMITS.requestWindowMs, t);
    bumpOf(state.buckets, `reqip:${rateIp}`, LIMITS.requestWindowMs, t);
    state.lastSent.set(normalized, t);
    if (allowlist.has(normalized)) {
      const code = mintCode();
      const salt = randomBytes(16);
      state.codes.set(normalized, {
        hash: hashCode(code, salt),
        salt,
        expiresAt: t + LIMITS.codeTtlMs,
        attempts: 0,
      });
      let delivered = false;
      try {
        const result = await sendEmail({
          to: normalized,
          code,
          idempotencyKey: `sign-in-code/${randomUUID()}`,
        });
        delivered = result == null || result.ok !== false;
      } catch {
        console.error('sign-in email failed');
      }
      if (!delivered) state.codes.delete(normalized);
    }
    return { status: 200, body: GENERIC };
  });
}

export async function verifyCode(store, { email, code, ip, now, secret }) {
  const normalized = normalizeEmail(email);
  const digits = typeof code === 'string' ? code.trim() : '';
  if (!normalized || !/^\d{6}$/.test(digits)) return refused;
  return store.update(async (state) => {
    const t = now();
    sweep(state, t);
    const rateIp = ip || 'unknown';
    const verifyWait = Math.max(
      waitOf(state.buckets, `ver:${normalized}`, LIMITS.verifyPerEmail, t),
      waitOf(state.buckets, `verip:${rateIp}`, LIMITS.verifyPerIp, t),
    );
    if (verifyWait > 0) return tooMany(verifyWait, 'window');
    bumpOf(state.buckets, `ver:${normalized}`, LIMITS.verifyWindowMs, t);
    bumpOf(state.buckets, `verip:${rateIp}`, LIMITS.verifyWindowMs, t);
    if (!ip) return refused;
    const rec = state.codes.get(normalized);
    const actual = hashCode(digits, rec?.salt || DUMMY_SALT);
    const expectedHash = rec?.hash || DUMMY_HASH;
    const equal = actual.length === expectedHash.length && timingSafeEqual(actual, expectedHash);
    if (!rec || rec.expiresAt <= t) return refused;
    rec.attempts += 1;
    if (!equal || rec.attempts > LIMITS.maxAttempts) {
      if (rec.attempts >= LIMITS.maxAttempts) state.codes.delete(normalized);
      return refused;
    }
    state.codes.delete(normalized);
    const exp = Math.floor(t / 1000) + LIMITS.sessionTtlSec;
    return {
      status: 200,
      body: { ok: true, email: normalized },
      cookie: { value: signSession(normalized, exp, ip, secret), maxAge: LIMITS.sessionTtlSec },
    };
  });
}

export async function bumpAsk(store, email, now) {
  return store.update(async (state) => {
    const t = now();
    sweep(state, t);
    const wait = waitOf(state.buckets, `ask:${email}`, LIMITS.askPerEmail, t);
    if (wait > 0) return tooMany(wait, 'window');
    bumpOf(state.buckets, `ask:${email}`, LIMITS.askWindowMs, t);
    return { status: 200 };
  });
}

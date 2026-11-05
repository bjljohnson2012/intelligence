import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { answerQuestion } from './ask.js';
import { createMemoryStore, requestCode, verifyCode, bumpAsk } from '../shared/auth-flow.mjs';
import {
  LIMITS,
  ALLOWED_EMAILS,
  canonicalIp,
  cookieHeader,
  exactAllowlist,
  readSessionToken,
} from '../shared/intel-session.mjs';

export { LIMITS, ALLOWED_EMAILS };

const loginPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'login.html');
const loginPage = () => readFileSync(loginPath, 'utf8');

function clientIp(req) {
  return canonicalIp(req.ip || req.socket?.remoteAddress || '');
}

function readSession(req, secret, allowlist, now) {
  return readSessionToken({
    cookieHeader: req.headers.cookie || '',
    secret,
    allowlist,
    nowMs: now(),
    ip: clientIp(req),
  });
}

function refused(res) {
  res.set('Cache-Control', 'no-store');
  return res.status(401).json({ status: 'refused', unknownReason: 'Sign-in required' });
}

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.get('host'); } catch { return false; }
}

function sendAuth(res, result) {
  res.set('Cache-Control', 'no-store');
  if (result.retryAfterSec) res.set('Retry-After', String(result.retryAfterSec));
  if (result.cookie) res.setHeader('Set-Cookie', cookieHeader(result.cookie.value, result.cookie.maxAge));
  return res.status(result.status).json(result.body);
}

export function createApp({ env, sendEmail, distDir, now = () => Date.now(), complete }) {
  const secret = env.SESSION_SECRET || '';
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const allowlist = exactAllowlist(env.ALLOWLIST_EMAILS);
  const store = createMemoryStore();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  app.get('/login', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (readSession(req, secret, allowlist, now)) return res.redirect(302, '/');
    res.type('html').send(loginPage());
  });

  app.post('/api/auth/request-code', async (req, res) => {
    if (!sameOrigin(req)) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({ ok: false });
    }
    const result = await requestCode(store, {
      email: req.body?.email,
      ip: clientIp(req),
      now,
      allowlist,
      sendEmail,
    });
    return sendAuth(res, result);
  });

  app.post('/api/auth/verify', async (req, res) => {
    if (!sameOrigin(req)) return refused(res);
    const result = await verifyCode(store, {
      email: req.body?.email,
      code: req.body?.code,
      ip: clientIp(req),
      now,
      secret,
    });
    return sendAuth(res, result);
  });

  app.post('/api/auth/logout', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = readSession(req, secret, allowlist, now);
    if (!session) return refused(res);
    return res.json({ email: session.email });
  });

  app.get('/api/admin/council', (req, res) => {
    const session = readSession(req, secret, allowlist, now);
    if (!session || session.email !== 'bjljohnson2012@gmail.com') return refused(res);
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'council-admin.json');
    res.set('Cache-Control', 'private, no-store');
    return res.type('json').send(readFileSync(file));
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

  app.post('/api/ask', async (req, res) => {
    const session = readSession(req, secret, allowlist, now);
    if (!session) return refused(res);
    if (!sameOrigin(req)) return refused(res);
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question || question.length > 500) {
      return res.status(400).json({
        status: 'refused',
        unknownReason: 'Ask a short question about this plan.',
        answer: '',
        citations: [],
        residualsNamed: [],
        confidence: 'low',
        path: 'n/a',
      });
    }
    const gate = await bumpAsk(store, session.email, now);
    if (gate.status === 429) return sendAuth(res, gate);
    const pathHint = req.body?.pathHint;
    try {
      const payload = await answerQuestion({ distDir, env, question, pathHint, complete });
      return res.json(payload);
    } catch {
      console.error('ask failed');
      return res.status(500).json({
        status: 'refused',
        unknownReason: 'The plan could not be read just now.',
        answer: '',
        citations: [],
        residualsNamed: [],
        confidence: 'low',
        path: 'n/a',
      });
    }
  });
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

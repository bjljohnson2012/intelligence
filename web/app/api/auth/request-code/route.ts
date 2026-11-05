import { NextRequest } from 'next/server';
import { requestCode } from '@shared/auth-flow.mjs';
import { allowlist, ipFromHeaders, sessionSecret } from '@/lib/session';
import { rateStore } from '@/lib/rate-store';
import { sendSignInEmail } from '@/lib/mail';
import { authJson, sameOrigin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return authJson({ status: 400, body: { ok: false } });
  if (sessionSecret().length < 32) return authJson({ status: 500, body: { ok: false, message: 'Sign-in is not configured.' } });
  let list;
  try { list = allowlist(); } catch { return authJson({ status: 500, body: { ok: false, message: 'Sign-in is not configured.' } }); }
  const body = await request.json().catch(() => ({}));
  const email = body && typeof body === 'object' && 'email' in body ? body.email : '';
  const result = await requestCode(rateStore(), {
    email,
    ip: ipFromHeaders((name) => request.headers.get(name)),
    now: () => Date.now(),
    allowlist: list,
    sendEmail: sendSignInEmail,
  });
  return authJson(result);
}

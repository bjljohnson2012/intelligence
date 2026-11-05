import { NextRequest } from 'next/server';
import { verifyCode } from '@shared/auth-flow.mjs';
import { ipFromHeaders, sessionSecret } from '@/lib/session';
import { rateStore } from '@/lib/rate-store';
import { authJson, refused, sameOrigin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return refused();
  const secret = sessionSecret();
  if (secret.length < 32) return refused();
  const body = await request.json().catch(() => ({}));
  const email = body && typeof body === 'object' && 'email' in body ? body.email : '';
  const code = body && typeof body === 'object' && 'code' in body ? body.code : '';
  const result = await verifyCode(rateStore(), {
    email,
    code,
    ip: ipFromHeaders((name) => request.headers.get(name)),
    now: () => Date.now(),
    secret,
  });
  return authJson(result);
}

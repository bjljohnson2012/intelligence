import { NextResponse, type NextRequest } from 'next/server';
import { cookieHeader } from '@shared/intel-session.mjs';

type AuthResult = {
  status: number;
  body?: unknown;
  retryAfterSec?: number;
  cookie?: { value: string; maxAge: number };
};

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get('host'); } catch { return false; }
}

export function authJson(result: AuthResult) {
  const response = NextResponse.json(result.body ?? {}, { status: result.status });
  response.headers.set('Cache-Control', 'no-store');
  if (result.retryAfterSec) response.headers.set('Retry-After', String(result.retryAfterSec));
  if (result.cookie) response.headers.append('Set-Cookie', cookieHeader(result.cookie.value, result.cookie.maxAge));
  return response;
}

export function refused() {
  return NextResponse.json(
    { status: 'refused', unknownReason: 'Sign-in required' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

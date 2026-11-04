import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canonicalIp } from '../shared/ip.mjs';

const ALLOWED = new Set(['bjljohnson2012@gmail.com', 'alexander.varden@gmail.com']);

function bytes(value: string) {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function sessionOk(token: string, secret: string, ip: string) {
  const dot = token.indexOf('.');
  if (dot <= 0 || !secret || !ip) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  let valid = false;
  try {
    valid = await crypto.subtle.verify('HMAC', key, bytes(signature), new TextEncoder().encode(payload));
  } catch {
    return false;
  }
  if (!valid) return false;
  let data: { email?: unknown; exp?: unknown; ip?: unknown };
  try {
    data = JSON.parse(new TextDecoder().decode(bytes(payload))) as { email?: unknown; exp?: unknown; ip?: unknown };
  } catch {
    return false;
  }
  if (typeof data.email !== 'string' || !ALLOWED.has(data.email)) return false;
  if (data.ip !== ip) return false;
  if (typeof data.exp !== 'number' || data.exp * 1000 <= Date.now()) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const raw = (forwarded ? forwarded.split(',')[0].trim() : '') || request.ip || '';
  const ip = canonicalIp(raw);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-intel-ip', ip);
  if (request.nextUrl.pathname.startsWith('/evidence')) {
    const token = request.cookies.get('intel_session')?.value || '';
    const allowed = await sessionOk(token, process.env.SESSION_SECRET || '', ip);
    if (!allowed) {
      return new NextResponse('Sign-in required', {
        status: 401,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

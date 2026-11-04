import { NextRequest, NextResponse } from 'next/server';
import { cookieHeader } from '@shared/intel-session.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.headers.append('Set-Cookie', cookieHeader('', 0));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

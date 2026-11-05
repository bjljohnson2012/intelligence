import { NextResponse } from 'next/server';
import { readRequestSession } from '@/lib/session';
import { refused } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = readRequestSession();
  if (!session) return refused();
  return NextResponse.json({ email: session.email }, { headers: { 'Cache-Control': 'private, no-store' } });
}

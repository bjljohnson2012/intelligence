import { NextResponse } from 'next/server';
import { isCouncilAdmin } from '@shared/intel-session.mjs';
import { readRequestSession } from '@/lib/session';
import { loadCouncilHtml } from '@/lib/pack';
import { refused } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = readRequestSession();
  if (!session || !isCouncilAdmin(session.email)) return refused();
  return NextResponse.json(
    { html: loadCouncilHtml() },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

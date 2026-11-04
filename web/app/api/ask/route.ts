import { NextRequest, NextResponse } from 'next/server';
import { answerFromChunks } from '@shared/similarity.mjs';
import { bumpAsk } from '@shared/auth-flow.mjs';
import { readRequestSession } from '@/lib/session';
import { rateStore } from '@/lib/rate-store';
import { loadAskChunks } from '@/lib/pack';
import { authJson, refused, sameOrigin } from '@/lib/http';

export const dynamic = 'force-dynamic';

function pathName(value: unknown) {
  if (value === 'enterprise' || value === 'core' || value === 'all') return value;
  return 'all';
}

export async function POST(request: NextRequest) {
  const session = readRequestSession();
  if (!session) return refused();
  if (!sameOrigin(request)) return refused();
  const body = await request.json().catch(() => ({}));
  const question = body && typeof body === 'object' && 'question' in body && typeof body.question === 'string'
    ? body.question.trim()
    : '';
  if (!question || question.length > 500) {
    return NextResponse.json({
      status: 'refused',
      answer: '',
      citations: [],
      score: null,
      unknownReason: 'Ask a short question about this plan.',
    }, { status: 400 });
  }
  const gate = await bumpAsk(rateStore(), session.email, () => Date.now());
  if (gate.status === 429) return authJson(gate);
  const hint = body && typeof body === 'object' && 'pathHint' in body ? pathName(body.pathHint) : 'all';
  const loaded = await loadAskChunks();
  const result = answerFromChunks(question, loaded.chunks, hint);
  if (result.status === 'answered' && result.citations.length === 0) {
    return NextResponse.json({
      status: 'not_found',
      answer: '',
      citations: [],
      score: result.score,
      unknownReason: 'Not found. The best match is below 0.72.',
    });
  }
  return NextResponse.json(result);
}

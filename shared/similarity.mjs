import { ASK_MIN_SCORE } from './intel-session.mjs';

const STOP = new Set('a an the of to and or for in on with without from by at as is are was were be this that it we our their not do you your about into than then so if'.split(' '));

export function tokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((term) => term.length > 1 && !STOP.has(term));
}

export function termFrequency(list) {
  const counts = new Map();
  for (const term of list) counts.set(term, (counts.get(term) || 0) + 1);
  return counts;
}

export function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const [term, weight] of left) {
    leftNorm += weight * weight;
    const other = right.get(term);
    if (other) dot += weight * other;
  }
  for (const weight of right.values()) rightNorm += weight * weight;
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function bestChunk(question, chunks, pathName) {
  const asked = termFrequency(tokens(question));
  let best = null;
  for (const chunk of chunks) {
    if (pathName && pathName !== 'all' && Array.isArray(chunk.paths) && chunk.paths.length) {
      if (!chunk.paths.includes(pathName) && !chunk.paths.includes('all')) continue;
    }
    const score = cosineSimilarity(asked, termFrequency(tokens(`${chunk.title} ${chunk.content}`)));
    if (!best || score > best.score) best = { chunk, score };
  }
  return best;
}

export function answerFromChunks(question, chunks, pathName) {
  const text = String(question || '').trim();
  if (!text) {
    return {
      status: 'not_found',
      answer: '',
      citations: [],
      score: 0,
      unknownReason: 'Not found.',
    };
  }
  const best = bestChunk(text, chunks, pathName);
  const score = best ? best.score : 0;
  if (!best || score < ASK_MIN_SCORE || !best.chunk.id) {
    return {
      status: 'not_found',
      answer: '',
      citations: [],
      score,
      unknownReason: 'Not found. The best match is below 0.72.',
    };
  }
  return {
    status: 'answered',
    answer: best.chunk.content,
    citations: [{
      id: best.chunk.id,
      label: best.chunk.title,
      source: best.chunk.source || 'Pack',
    }],
    score,
    unknownReason: '',
  };
}

export { ASK_MIN_SCORE };

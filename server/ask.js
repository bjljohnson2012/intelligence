import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexFromPack, searchPack } from '../src/search.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SYSTEM = [
  'You answer only from the supplied plan chunks.',
  'Use plain English. Say Thing to plan for, Thing to think about, Still open, and Explicit Unknown.',
  'Do not invent numbers, sources, or what would clear an item.',
  'If the chunks do not support an answer, status is explicit_unknown.',
  'Never say an item is proven, cleared, or passed when its status is fail, partial, open, or unknown.',
  'Live Core stays HOLD.',
  'Return JSON only: {"answer":"","status":"answered|explicit_unknown|refused","citations":[{"itemId":""}],"confidence":"low|medium|high","unknownReason":""}.',
].join(' ');

let cached;

export function loadPack(distDir) {
  const candidates = [
    distDir ? path.join(distDir, 'data', 'pack.json') : '',
    path.join(root, 'public', 'data', 'pack.json'),
  ].filter(Boolean);
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) throw new Error('pack missing');
  if (!cached || cached.file !== file) {
    const pack = JSON.parse(readFileSync(file, 'utf8'));
    cached = { file, pack, index: indexFromPack(pack) };
  }
  return cached;
}

function normalizePath(value) {
  if (value === 'enterprise') return 'enterprise';
  if (value === 'all' || value === 'either' || value === 'both') return 'all';
  return 'core';
}

function responsePath(pathHint) {
  if (pathHint === 'enterprise') return 'enterprise';
  if (pathHint === 'all') return 'both';
  return 'core';
}

function figures(text) {
  return new Set(String(text || '').match(/\$?\d[\d,]*(?:\.\d+)?%?/g) || []);
}

function cite(hit, pathHint) {
  return {
    kind: hit.kind === 'open' ? 'residual' : 'exhibit',
    id: hit.badge || hit.itemId,
    itemId: hit.itemId,
    label: hit.label,
    href: `/?path=${pathHint}&section=${hit.go}&item=${hit.itemId}`,
  };
}

function explicitUnknown(pack, pathHint, reason, hits) {
  const opens = (hits || []).filter((hit) => hit.kind === 'open').slice(0, 4);
  const fallback = opens.length ? opens : searchPack(pack.index, 'still open', pathHint, 4).filter((hit) => hit.kind === 'open');
  return {
    answer: 'The plan does not say. These are the closest items that still need clarification.',
    path: responsePath(pathHint),
    citations: fallback.map((hit) => cite(hit, pathHint)),
    residualsNamed: fallback.map((hit) => hit.badge).filter(Boolean),
    confidence: 'low',
    status: 'explicit_unknown',
    unknownReason: reason,
    corpusVersion: pack.pack.corpusVersion,
  };
}

function oneAnswer(hit) {
  const plain = String(hit.plain || hit.label || '').replace(/\s+/g, ' ').trim();
  const sentence = plain.split(/(?<=[.!?])\s/)[0] || plain;
  return (sentence.length >= 48 ? sentence : plain).slice(0, 360);
}

function extractive(pack, question, pathHint, hits) {
  const top = hits.filter((hit) => hit.itemId && !String(hit.itemId).startsWith('section-') && (hit.baseScore || 0) >= 8).slice(0, 3);
  if (!top.length) {
    return explicitUnknown(pack, pathHint, 'Not in the pack.', hits);
  }
  const answer = oneAnswer(top[0]);
  return {
    answer,
    path: responsePath(pathHint),
    citations: top.map((hit) => cite(hit, pathHint)),
    residualsNamed: [...new Set(top.flatMap((hit) => (hit.text.match(/\bR\d\b/g) || [])))],
    confidence: 'medium',
    status: 'answered',
    unknownReason: '',
    corpusVersion: pack.pack.corpusVersion,
  };
}

function parseModel(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function grounded(pack, pathHint, model, hits) {
  if (!model || typeof model.answer !== 'string' || !model.answer.trim()) return null;
  const allowed = new Map(hits.filter((hit) => hit.itemId).map((hit) => [hit.itemId, hit]));
  const cited = Array.isArray(model.citations) ? model.citations : [];
  const used = cited.map((item) => allowed.get(item.itemId)).filter(Boolean);
  if (!used.length) return null;
  const corpus = used.map((hit) => hit.text || '').join(' ');
  const invented = [...figures(model.answer)].filter((figure) => !corpus.includes(figure));
  if (invented.length) return null;
  const status = String(model.status || '');
  if (!['answered', 'explicit_unknown', 'refused'].includes(status)) return null;
  const lowered = model.answer.toLowerCase();
  const blocked = used.some((hit) => /fail|unknown|open|partial|hold/.test(`${hit.text} ${hit.badge}`.toLowerCase()));
  if (blocked && /\b(proven|cleared)\b/i.test(model.answer)) return null;
  if (lowered.includes('microsoft') || lowered.includes('azure')) return null;
  return {
    answer: model.answer.trim(),
    path: responsePath(pathHint),
    citations: used.map((hit) => cite(hit, pathHint)),
    residualsNamed: [...new Set(used.flatMap((hit) => (String(hit.text).match(/\bR\d\b/g) || [])))],
    confidence: ['low', 'medium', 'high'].includes(model.confidence) ? model.confidence : 'medium',
    status,
    unknownReason: status === 'answered' ? '' : (model.unknownReason || 'Not in the pack.'),
    corpusVersion: pack.pack.corpusVersion,
  };
}

async function modelAnswer(env, question, pathHint, hits) {
  const key = env.XAI_API_KEY || env.ASK_API_KEY || '';
  if (!key) return null;
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.ASK_MODEL || 'grok-4',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            question,
            path: pathHint,
            chunks: hits.slice(0, 8).map((hit) => ({
              itemId: hit.itemId,
              title: hit.label,
              text: String(hit.text || '').slice(0, 700),
            })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error('ask model failed');
  const data = await response.json();
  return parseModel(data.choices?.[0]?.message?.content || '');
}

export async function answerQuestion({ distDir, env = {}, question, pathHint, complete }) {
  const pack = loadPack(distDir);
  const pathName = normalizePath(pathHint);
  const text = String(question || '').trim();
  if (/go live|launch core live|invent a win rate/i.test(text)) {
    const hits = searchPack(pack.index, 'live core hold', pathName, 4);
    return {
      answer: 'Live Core stays HOLD. Asking does not clear an open item and does not start live selling.',
      path: responsePath(pathName),
      citations: hits.slice(0, 3).map((hit) => cite(hit, pathName)),
      residualsNamed: ['R1', 'R4'],
      confidence: 'high',
      status: 'refused',
      unknownReason: 'Live Core is HOLD. The plan does not invent a win rate.',
      corpusVersion: pack.pack.corpusVersion,
    };
  }
  const hits = searchPack(pack.index, text, pathName, 8);
  let model = null;
  if (complete) model = await complete({ question: text, path: pathName, hits });
  else model = await modelAnswer(env, text, pathName, hits);
  return grounded(pack, pathName, model, hits) || extractive(pack, text, pathName, hits);
}

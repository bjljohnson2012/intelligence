'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { NotionCta } from '@/components/notion-cta';

type Citation = { id: string; label: string; source: string };
type Turn = {
  id: string;
  question: string;
  status: 'answered' | 'not_found' | 'refused' | 'error';
  answer: string;
  citations: Citation[];
  score: number | null;
  unknownReason: string;
};

const PATHS = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Core' },
  { id: 'enterprise', label: 'Enterprise' },
] as const;

type PathId = (typeof PATHS)[number]['id'];

export function AskPanel({ source }: { source: string }) {
  const [pathName, setPathName] = useState<PathId>('all');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending) return;
    setPending(true);
    setQuestion('');
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, pathHint: pathName }),
      });
      const body = await response.json() as Turn;
      const turn: Turn = {
        id: `${Date.now()}`,
        question: text,
        status: body.status === 'answered' || body.status === 'not_found' || body.status === 'refused' ? body.status : 'error',
        answer: body.status === 'answered' ? body.answer : '',
        citations: Array.isArray(body.citations) ? body.citations : [],
        score: typeof body.score === 'number' ? body.score : null,
        unknownReason: body.unknownReason || 'Not found.',
      };
      if (turn.status === 'answered' && turn.citations.length === 0) {
        turn.status = 'not_found';
        turn.answer = '';
        turn.unknownReason = 'Not found. The best match is below 0.72.';
      }
      setTurns((current) => [...current, turn].slice(-12));
    } catch {
      const failed: Turn = {
        id: `${Date.now()}`,
        question: text,
        status: 'error',
        answer: '',
        citations: [],
        score: null,
        unknownReason: 'The plan could not be read just now.',
      };
      setTurns((current) => [...current, failed].slice(-12));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 px-4 pt-3">
        {PATHS.map((item) => (
          <button key={item.id} type="button" onClick={() => setPathName(item.id)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${pathName === item.id ? 'bg-mist text-accent' : 'text-muted hover:bg-paper'}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="rounded-md border-l-[3px] border-accent bg-[#EEF6FC] px-3 py-2.5 text-xs leading-5 text-ink">
          <strong>This chat is not saved.</strong> Answers come from the pack in this session. For the durable plan and comments, open Notion.
        </div>
        <NotionCta tone="primary" arrow className="w-full" />
        <p className="text-[11px] leading-4 text-muted">Session turns only · clears when you leave · no Ask history · no saved views</p>
      </div>
      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 pb-3">
        {turns.length === 0 ? <p className="text-sm leading-6 text-muted">Ask about this plan. A match at 0.72 or above is quoted with its source. Anything lower is not found.</p> : null}
        {turns.map((turn) => (
          <article key={turn.id} className="space-y-2">
            <p className="ml-8 rounded-lg bg-navy px-3 py-2 text-sm text-white">{turn.question}</p>
            {turn.status === 'answered' ? (
              <div className="min-w-0 rounded-lg border border-line bg-paper px-3 py-2 text-sm leading-6">
                <p className="break-words">{turn.answer}</p>
                <p className="mt-2 text-[11px] text-muted">{turn.score === null ? '' : `${turn.score.toFixed(2)} cosine`}</p>
                <ul className="mt-2 space-y-1">
                  {turn.citations.map((citation) => (
                    <li key={citation.id} className="break-words text-xs text-navy">[{citation.id}] {citation.label} — {citation.source}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted">{turn.unknownReason}{turn.score === null ? '' : ` (${turn.score.toFixed(2)})`}</p>
            )}
          </article>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="flex flex-wrap items-center gap-2 px-3 pt-3 max-[800px]:items-stretch">
          <p className="min-w-0 flex-1 text-[11px] leading-4 text-muted">{source}</p>
          <NotionCta tone="ghost" size="sm" className="max-[800px]:w-full" />
        </div>
        <form onSubmit={submit} className="p-3">
          <label className="sr-only" htmlFor="ask-q">Question</label>
          <textarea id="ask-q" value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={500} placeholder="Ask a question the pack can answer" className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={pending || !question.trim()}>{pending ? 'Checking' : 'Ask'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

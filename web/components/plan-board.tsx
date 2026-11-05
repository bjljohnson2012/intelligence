'use client';

import { useMemo, useState } from 'react';
import type { Milestone } from '@/lib/pack';
import { Button } from '@/components/ui/button';

const PAGE = 6;

export function PlanBoard({ rows }: { rows: Milestone[] }) {
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState('');
  const [page, setPage] = useState(1);
  const owners = useMemo(() => [...new Set(rows.map((row) => row.owner))], [rows]);
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.status))], [rows]);
  const filtered = rows.filter((row) => {
    if (owner && row.owner !== owner) return false;
    if (status && row.status !== status) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice((page - 1) * PAGE, page * PAGE);

  function setAndReset(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
      setOpenId('');
    };
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">Quarters are Explicit Unknown in the source, so there is no quarter filter. Every item below is undated.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select label="Owner" value={owner} onChange={setAndReset(setOwner)} options={owners} all="All owners" />
        <Select label="Status" value={status} onChange={setAndReset(setStatus)} options={statuses} all="Any status" />
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No milestone in the pack matches that owner or status.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-line pl-5">
          {visible.map((item) => {
            const open = openId === item.id;
            return (
              <li key={item.id}>
                <button type="button" onClick={() => setOpenId(open ? '' : item.id)} className="w-full rounded-xl border border-line bg-white p-4 text-left shadow-card hover:-translate-y-0.5 hover:shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Undated · Explicit Unknown · {item.status}</span>
                  <span className="mt-1 block font-display text-base font-bold text-navy">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted">{item.owner} · {item.source}</span>
                  {open ? <span className="mt-3 block border-t border-line pt-3 text-sm leading-6 text-ink">{item.detail}</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}

function Select({ label, value, onChange, options, all }: { label: string; value: string; onChange: (value: string) => void; options: string[]; all: string }) {
  return (
    <label className="text-xs text-muted">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-sm text-ink">
        <option value="">{all}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-xs text-muted">Page {page} of {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { EvidenceRow } from '@/lib/pack';
import { Capture } from '@/components/capture';
import { useDrawer } from '@/components/shell';
import { Pager } from '@/components/plan-board';

const PAGE = 8;

export function EvidenceBrowser({ rows }: { rows: EvidenceRow[] }) {
  const { openDetail, close } = useDrawer();
  const [rival, setRival] = useState('all');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(1);
  const rivals = useMemo(() => [...new Set(rows.map((row) => row.rival))], [rows]);
  const kinds = useMemo(() => [...new Set(rows.map((row) => row.kind))], [rows]);
  const filtered = rows.filter((row) => (rival === 'all' || row.rival === rival) && (kind === 'all' || row.kind === kind));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={rival} onChange={(event) => { setRival(event.target.value); setPage(1); close(); }} className="h-9 rounded-md border border-line bg-white px-2 text-sm" aria-label="Rival">
          <option value="all">All rivals</option>
          {rivals.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); close(); }} className="h-9 rounded-md border border-line bg-white px-2 text-sm" aria-label="Kind">
          <option value="all">All kinds</option>
          {kinds.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Capture</th><th className="px-3 py-2">Decision</th><th className="px-3 py-2">Rival</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <button type="button" className="text-left font-medium text-navy hover:underline" onClick={() => openDetail({
                    title: row.title,
                    kicker: `${row.captured} · marketing page`,
                    lines: [row.decision],
                    image: row.src,
                    facts: [
                      { label: 'Decision', value: row.decision },
                      { label: 'Page', value: row.url },
                    ],
                  })}>
                    {row.title}
                  </button>
                </td>
                <td className="px-3 py-2">{row.decision}</td>
                <td className="px-3 py-2">{row.rival}</td>
                <td className="px-3 py-2">{row.kind}</td>
                <td className="px-3 py-2">{row.captured}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? <p className="mt-3 text-sm text-muted">No captures match.</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((row) => (
          <figure key={`${row.id}-shot`} className="overflow-hidden rounded-xl border border-line bg-white">
            <Capture src={row.src} alt={row.title} />
            <figcaption className="px-3 py-2 text-xs leading-5 text-muted">{row.title}</figcaption>
          </figure>
        ))}
      </div>
      <Pager page={safePage} pages={pages} onPage={setPage} />
    </div>
  );
}

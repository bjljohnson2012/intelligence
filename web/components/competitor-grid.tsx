'use client';

import { useState } from 'react';
import type { ClaimCard, Rival } from '@/lib/pack';
import { useDrawer } from '@/components/shell';
import { Pager } from '@/components/plan-board';

const PAGE = 4;

export function CompetitorGrid({ rivals, claims }: { rivals: Rival[]; claims: ClaimCard[] }) {
  const { openDetail } = useDrawer();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(claims.length / PAGE));
  const visible = claims.slice((page - 1) * PAGE, page * PAGE);
  return (
    <div>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rivals.map((rival) => (
          <button
            key={rival.name}
            type="button"
            onClick={() => openDetail({
              title: rival.name,
              kicker: 'Logo · Explicit Unknown',
              lines: [rival.promise, rival.note],
              facts: [
                { label: 'What they do', value: `${rival.promise} ${rival.strength} Pricing: ${rival.pricing}` },
                { label: 'Where we are ready', value: rival.ready },
                { label: 'Do not', value: rival.dont },
                { label: 'Headline', value: rival.headline },
                { label: 'Sizes', value: rival.sizes },
              ],
            })}
            className="flex h-full flex-col rounded-xl border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy font-display text-sm font-bold text-white" aria-hidden>{rival.initials}</span>
            <span className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">Logo · Explicit Unknown</span>
            <span className="mt-2 font-display text-lg font-bold text-navy">{rival.name}</span>
            <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-accent">What they do</span>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-5">
              <li>{rival.promise}</li>
              <li>{rival.strength}</li>
              <li>{rival.pricing}</li>
            </ul>
            <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-good">Where we are ready</span>
            <p className="mt-1 text-sm leading-5">{rival.ready}</p>
          </button>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-base font-bold text-navy">Where we win and lose</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((claim) => (
          <article key={claim.id} className="flex h-full min-h-[8.5rem] flex-col rounded-xl border border-line bg-white p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{claim.status}</span>
            <h3 className="mt-1 font-display text-sm font-bold text-navy">{claim.title}</h3>
            <p className="mt-2 text-sm leading-5 text-ink">{claim.text}</p>
          </article>
        ))}
      </div>
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}

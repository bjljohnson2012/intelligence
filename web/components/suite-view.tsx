'use client';

import { useState } from 'react';
import type { ModuleCompare } from '@/lib/pack';
import { Capture } from '@/components/capture';

function moveLabel(mod: ModuleCompare) {
  if (mod.unknown || mod.move === 'unknown') return 'Explicit Unknown';
  if (mod.move === 'steal') return 'Steal';
  if (mod.move === 'counter') return 'Counter';
  if (mod.move === 'refuse') return 'Refuse';
  return 'Explicit Unknown';
}

export function SuiteView({ modules }: { modules: ModuleCompare[] }) {
  const [id, setId] = useState(modules.find((mod) => mod.id === 'first-screen')?.id || modules[0]?.id || '');
  const current = modules.find((mod) => mod.id === id) || modules[0];
  if (!current) return <p className="text-sm text-muted">No module compare is in the pack.</p>;
  return (
    <div>
      <p className="mb-3 rounded-xl border border-line bg-mist px-3 py-2 text-sm leading-6 text-ink">These are public marketing pages captured November 3–4, 2026. There is no logged-in Amplify module screenshot, so a module that only has a homepage is still a homepage.</p>
      <label className="mb-3 block text-xs text-muted">
        Module
        <select value={current.id} onChange={(event) => setId(event.target.value)} className="ml-2 h-9 rounded-md border border-line bg-white px-2 text-sm text-ink">
          {modules.map((mod) => <option key={mod.id} value={mod.id}>{mod.name}</option>)}
        </select>
      </label>
      <article className="rounded-xl border border-line bg-white p-4 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{moveLabel(current)}</p>
        <h2 className="mt-1 font-display text-xl font-bold text-navy">{current.name}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{current.decision}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ShotColumn title="Amplify" files={current.amplify} empty="No Amplify marketing page for this module." decision={current.decision} />
          <ShotColumn title="Rival" files={current.rivals} empty="No rival page in this compare." decision={current.decision} />
        </div>
      </article>
    </div>
  );
}

function ShotColumn({ title, files, empty, decision }: { title: string; files: string[]; empty: string; decision: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {files.length === 0 ? <p className="mt-2 text-sm text-muted">{empty}</p> : null}
      <div className="mt-2 space-y-3">
        {files.map((file) => (
          <figure key={file} className="overflow-hidden rounded-xl border border-line bg-white">
            <Capture src={`/evidence/comp-2026-11-04/${file}`} alt={decision} tall />
            <figcaption className="px-3 py-2 text-xs leading-5 text-muted">Public marketing page</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

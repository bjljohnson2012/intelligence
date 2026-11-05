'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeatRow } from '@/lib/pack';
import { Pager } from '@/components/plan-board';

const PAGE = 8;

export function SeatsView({ rows, byTeam }: { rows: SeatRow[]; byTeam: { team: string; count: number }[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);
  return (
    <div>
      <div className="h-56 rounded-xl border border-line bg-white p-3 shadow-card">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byTeam} layout="vertical" margin={{ left: 24, right: 28 }}>
            <CartesianGrid stroke="#E4E2E0" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#706B65', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="team" width={150} tick={{ fill: '#504A43', fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0A5BCC" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="count" position="right" fill="#0F3E80" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Seat</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Person</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Territory</th><th className="px-3 py-2">Quota</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-navy">{row.id}</td>
                <td className="px-3 py-2">{row.team}</td>
                <td className="px-3 py-2">{row.person}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.territory || '—'}</td>
                <td className="px-3 py-2">{row.quota === null ? 'Explicit Unknown' : row.quota.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}

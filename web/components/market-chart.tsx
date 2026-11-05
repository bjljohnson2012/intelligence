'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Band } from '@/lib/pack';

export function MarketChart({ bands, note }: { bands: Band[]; note: string }) {
  const held = bands.filter((band) => band.attendeesPct === null || /2,000\+/.test(band.label));
  const data = bands.filter((band) => !held.includes(band)).map((band) => ({
    label: band.label.replace(' (', '\n('),
    churches: band.congregationsPct,
    attendees: band.attendeesPct === null ? undefined : band.attendeesPct,
    count: band.count,
    confidence: band.confidence,
  }));
  return (
    <section id="attendance" className="mt-4 scroll-mt-4 rounded-xl border border-line bg-white p-4 shadow-card">
      <h2 className="font-display text-base font-bold text-navy">Share of churches and churchgoers</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{note}</p>
      {held.map((band) => (
        <p key={band.label} className="mt-1 text-xs leading-5 text-muted">
          {band.label}: congregation count {band.count}
          {typeof band.congregationsPct === 'number' ? ` (${band.congregationsPct}% of congregations in the source)` : ''}.
          Attendee share is Explicit Unknown and is not plotted.
        </p>
      ))}
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid stroke="#E4E2E0" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#706B65', fontSize: 11 }} interval={0} />
            <YAxis tick={{ fill: '#706B65', fontSize: 11 }} unit="%" width={36} />
            <Tooltip formatter={(value, name) => [`${value}%`, name === 'churches' ? 'Churches' : 'Churchgoers']} />
            <Bar dataKey="churches" name="churches" fill="#0F3E80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="attendees" name="attendees" fill="#0A5BCC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

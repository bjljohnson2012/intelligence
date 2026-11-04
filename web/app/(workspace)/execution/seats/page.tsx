import { EXEC_TABS } from '@/lib/nav';
import { loadSeats } from '@/lib/pack';
import { SeatsView } from '@/components/seats-view';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function SeatsPage() {
  const data = loadSeats();
  const tiles = [
    { label: 'Seats', value: String(data.total) },
    { label: 'Filled', value: String(data.byStatus.find((item) => item.status === 'Filled')?.count || 0) },
    { label: 'Open or planned', value: String(data.gaps) },
    { label: 'Hired, name TBD', value: String(data.byStatus.find((item) => item.status === 'Hired (name TBD)')?.count || 0) },
  ];
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Execution Pipeline" title="Seats" lede="Totals first. Open and planned seats are the gap. The table is paged." />
      <PageTabs tabs={EXEC_TABS} current="/execution/seats" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <article key={tile.label} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-xs text-muted">{tile.label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-navy">{tile.value}</p>
          </article>
        ))}
      </div>
      <SeatsView rows={data.rows} byTeam={data.byTeam} />
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

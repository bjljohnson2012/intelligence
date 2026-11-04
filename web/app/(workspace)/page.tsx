import Link from 'next/link';
import { EXEC_TABS, INTEL_TABS, MARKET_TABS } from '@/lib/nav';
import { loadOverview } from '@/lib/pack';
import { isCouncilAdmin } from '@shared/intel-session.mjs';
import { requireSession } from '@/lib/session';
import { MarketChart } from '@/components/market-chart';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function OverviewPage() {
  const session = requireSession();
  const data = loadOverview(isCouncilAdmin(session.email));
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Market & TAM" title="Commercial overview" lede={data.lede} />
      <PageTabs tabs={MARKET_TABS} current="/" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-xs text-muted">{item.label}</p>
            <p className={`mt-1 font-display text-[1.7rem] font-bold leading-none ${item.value === 'HOLD' ? 'text-hold' : 'text-navy'}`}>{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{item.note}</p>
          </article>
        ))}
      </div>
      <MarketChart bands={data.bands} note={data.chartNote} />
      <section className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-3 py-3 text-left font-display text-base font-bold text-navy">Core and Enterprise, side by side</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              {data.compare.columns.map((column) => <th key={column || 'metric'} className="px-3 py-2">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.compare.rows.map((row) => (
              <tr key={row[0]} className="border-t border-line">
                {row.map((cell, index) => <td key={`${row[0]}-${index}`} className="px-3 py-2">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <h2 className="mb-3 mt-8 font-display text-base font-bold text-navy">Read in this order</h2>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card) => (
          <Link key={card.n} href={card.href} className="flex h-full min-h-[9.5rem] flex-col rounded-xl border border-line bg-white p-4 shadow-card hover:-translate-y-0.5">
            <span className="font-display text-sm font-bold text-accent">{card.n}</span>
            <span className="mt-2 font-display text-base font-bold text-navy">{card.title}</span>
            <span className="mt-2 text-sm leading-5 text-ink">{card.body}</span>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Link href={INTEL_TABS[0].href} className="rounded-xl border border-line bg-white p-4 text-sm font-medium text-navy">Open competitive intel</Link>
        <Link href="/market/territories" className="rounded-xl border border-line bg-white p-4 text-sm font-medium text-navy">Open the territory map</Link>
        <Link href={EXEC_TABS[0].href} className="rounded-xl border border-line bg-white p-4 text-sm font-medium text-navy">Open seats and the pipeline</Link>
      </div>
      <SourceNote>{`${data.source} ${data.compare.source}`}</SourceNote>
    </div>
  );
}

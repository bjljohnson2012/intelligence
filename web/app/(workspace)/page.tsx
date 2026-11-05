import Link from 'next/link';
import { MARKET_TABS } from '@/lib/nav';
import { loadOverview } from '@/lib/pack';
import { requireSession } from '@/lib/session';
import { MarketChart } from '@/components/market-chart';
import { NotionCta, PackSourceFooter } from '@/components/notion-cta';
import { PageIntro, PageTabs } from '@/components/page-tabs';

export default function OverviewPage() {
  requireSession();
  const data = loadOverview();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Market & TAM" title="Commercial overview" lede={data.lede} />
      <section aria-label="Notion MI dashboard" className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-mist bg-gradient-to-b from-[#EEF6FC] to-white px-5 py-[18px] shadow-card max-[800px]:flex-col max-[800px]:items-stretch">
        <div className="min-w-[220px] flex-1">
          <span className="mb-2 inline-block rounded-md bg-mist px-2 py-0.5 text-[11px] font-semibold text-navy">Primary bridge</span>
          <h2 className="font-display text-base font-bold text-navy">Open the Market Intelligence dashboard</h2>
          <p className="mt-1 text-[13px] leading-[1.45] text-muted">Full plan, residuals, and reading order live in Notion. This site is the live pack view. Supabase is deferred.</p>
        </div>
        <NotionCta tone="primary" arrow className="h-auto px-[18px] py-3 text-[15px] max-[800px]:w-full" />
      </section>
      <PageTabs tabs={MARKET_TABS} current="/" />
      <h2 id="path" className="mb-3 font-display text-base font-bold text-navy">Read in this order</h2>
      <div className="mb-6 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card) => (
          <Link key={card.n} href={card.href} className="flex h-full min-h-[9.5rem] flex-col rounded-xl border border-line bg-white p-4 shadow-card hover:-translate-y-0.5">
            <span className="font-display text-sm font-bold text-accent">{card.n}</span>
            <span className="mt-2 font-display text-base font-bold text-navy">{card.title}</span>
            <span className="mt-2 text-sm leading-5 text-ink">{card.body}</span>
          </Link>
        ))}
      </div>
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
      <PackSourceFooter>{`${data.source} ${data.compare.source}`}</PackSourceFooter>
    </div>
  );
}

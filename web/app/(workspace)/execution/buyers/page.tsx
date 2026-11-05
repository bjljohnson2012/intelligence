import { EXEC_TABS } from '@/lib/nav';
import { loadBuyers } from '@/lib/pack';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function BuyersPage() {
  const data = loadBuyers();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Execution Pipeline" title="Buyers" lede={data.coldOpen} />
      <PageTabs tabs={EXEC_TABS} current="/execution/buyers" />
      <p className="mb-4 text-sm text-muted">Order: {data.order.join(' → ')}. {data.fees}</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Job</th><th className="px-3 py-2">Buyer words</th><th className="px-3 py-2">Of 71</th><th className="px-3 py-2">Use</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((job) => (
              <tr key={job.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-navy">{job.id}</td>
                <td className="px-3 py-2">{job.words}</td>
                <td className="px-3 py-2">{job.of71}</td>
                <td className="px-3 py-2">{job.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {[data.core, data.enterprise].map((map) => (
          <section key={map.label} className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-display text-base font-bold text-navy">{map.label}</h2>
            <p className="text-xs text-muted">{map.confidence}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {map.seats.map((seat) => <li key={seat.seat}><b className="text-navy">{seat.seat}.</b> {seat.who} <span className="text-muted">({seat.demo})</span></li>)}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-4 rounded-xl border border-line bg-white p-4">
        <h2 className="font-display text-base font-bold text-navy">Do not say</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{data.refused.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

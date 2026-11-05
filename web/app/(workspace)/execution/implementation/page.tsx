import { EXEC_TABS } from '@/lib/nav';
import { loadImplementation } from '@/lib/pack';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function ImplementationPage() {
  const data = loadImplementation();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Execution Pipeline" title="Implementation" lede="What is blocked, and what this week actually says. Live Core stays HOLD." />
      <PageTabs tabs={EXEC_TABS} current="/execution/implementation" />
      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-bold text-navy">This week</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
          {data.week.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Item</th><th className="px-3 py-2">Gap</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Owner</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-navy">{row.id}</td>
                <td className="px-3 py-2">{row.plain}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

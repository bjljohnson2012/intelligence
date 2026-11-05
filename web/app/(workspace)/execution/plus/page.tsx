import { EXEC_TABS } from '@/lib/nav';
import { loadPlus } from '@/lib/pack';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function PlusPage() {
  const data = loadPlus();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Execution Pipeline" title="Partner tier" lede="This motion is off the 2027 plan. The roster below is the source file, under the Partner tier name." />
      <PageTabs tabs={EXEC_TABS} current="/execution/plus" />
      <article className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
        <p className="text-xs text-muted">Clients in the plan</p>
        <p className="mt-1 font-display text-3xl font-bold text-navy">{data.clients.toLocaleString('en-US')}</p>
      </article>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">States</th><th className="px-3 py-2">Clients</th><th className="px-3 py-2">Amplify</th><th className="px-3 py-2">Legacy</th><th className="px-3 py-2">Other</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.name} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-navy">{row.name}</td>
                <td className="px-3 py-2">{row.states}</td>
                <td className="px-3 py-2">{row.clients.toLocaleString('en-US')}</td>
                <td className="px-3 py-2">{row.amplify.toLocaleString('en-US')}</td>
                <td className="px-3 py-2">{row.legacy.toLocaleString('en-US')}</td>
                <td className="px-3 py-2">{row.other.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

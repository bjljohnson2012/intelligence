import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isCouncilAdmin } from '@shared/intel-session.mjs';
import { requireSession } from '@/lib/session';
import { loadCouncil } from '@/lib/pack';
import { PageIntro } from '@/components/page-tabs';

export default function CouncilPage() {
  const session = requireSession();
  if (!isCouncilAdmin(session.email)) redirect('/');
  const record = loadCouncil();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Admin" title="Council" lede="This record is only for the admin seat. It is the review archive, not a selling page." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {record.cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-navy">{card.value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{card.note}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-navy">Back to Start here</Link>
        <Link href="/market/plan" className="rounded-md border border-line bg-mist px-3 py-2 text-sm font-medium text-navy">Optional deeper: Market & TAM</Link>
      </div>
      <details className="mt-4 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer px-4 py-3 font-display text-sm font-bold text-navy">Full review record</summary>
        <div className="council-record border-t border-line p-4 text-sm leading-6" dangerouslySetInnerHTML={{ __html: record.html }} />
      </details>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { isCouncilAdmin } from '@shared/intel-session.mjs';
import { requireSession } from '@/lib/session';
import { loadCouncilHtml } from '@/lib/pack';
import { PageIntro } from '@/components/page-tabs';

export default function CouncilPage() {
  const session = requireSession();
  if (!isCouncilAdmin(session.email)) redirect('/');
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Admin" title="Council" lede="This record is only for the admin seat. It is the review archive, not a selling page." />
      <div className="council-record max-h-[70vh] overflow-auto rounded-xl border border-line bg-white p-4 text-sm leading-6" dangerouslySetInnerHTML={{ __html: loadCouncilHtml() }} />
    </div>
  );
}

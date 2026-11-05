import { Shell } from '@/components/shell';
import { loadAskChunks } from '@/lib/pack';
import { requireSession } from '@/lib/session';
import { isCouncilAdmin } from '@shared/intel-session.mjs';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  const ask = await loadAskChunks();
  return <Shell email={session.email} admin={isCouncilAdmin(session.email)} askSource={ask.source}>{children}</Shell>;
}

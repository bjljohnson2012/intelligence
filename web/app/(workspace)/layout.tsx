import { Shell } from '@/components/shell';
import { requireSession } from '@/lib/session';
import { isCouncilAdmin } from '@shared/intel-session.mjs';

export const dynamic = 'force-dynamic';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  return <Shell email={session.email} admin={isCouncilAdmin(session.email)}>{children}</Shell>;
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { Compass, Menu, Milestone, Sparkles, Swords, X } from 'lucide-react';
import { RAIL } from '@/lib/nav';
import { Button } from '@/components/ui/button';
import { AskPanel } from '@/components/ask-panel';
import { Capture } from '@/components/capture';

export type Detail = {
  title: string;
  kicker: string;
  lines: string[];
  facts: { label: string; value: string }[];
  image?: string;
};

type DrawerState =
  | { kind: 'closed' }
  | { kind: 'ask' }
  | { kind: 'detail'; detail: Detail };

type DrawerAction =
  | { type: 'open-ask' }
  | { type: 'open-detail'; detail: Detail }
  | { type: 'close' };

const initialDrawer: DrawerState = { kind: 'closed' };

function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case 'open-ask':
      return { kind: 'ask' };
    case 'open-detail':
      return { kind: 'detail', detail: action.detail };
    case 'close':
      return initialDrawer;
    default: {
      const neverAction: never = action;
      return neverAction;
    }
  }
}

const DrawerContext = createContext<{
  openAsk: () => void;
  openDetail: (detail: Detail) => void;
  close: () => void;
} | null>(null);

export function useDrawer() {
  const value = useContext(DrawerContext);
  if (!value) throw new Error('Drawer is only available inside the workspace shell.');
  return value;
}

const ICONS = [Compass, Swords, Milestone] as const;

export function Shell({ email, admin, children }: { email: string; admin: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [drawer, dispatch] = useReducer(drawerReducer, initialDrawer);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    setRailOpen(false);
    dispatch({ type: 'close' });
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (drawer.kind !== 'closed') dispatch({ type: 'close' });
      else setRailOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer.kind]);

  const open = drawer.kind !== 'closed';

  return (
    <DrawerContext.Provider value={{
      openAsk: () => dispatch({ type: 'open-ask' }),
      openDetail: (detail) => dispatch({ type: 'open-detail', detail }),
      close: () => dispatch({ type: 'close' }),
    }}>
      <div className="flex h-screen flex-col bg-paper text-ink">
        <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-white px-4">
          <button type="button" className="rounded-md p-1.5 text-navy hover:bg-paper md:hidden" aria-label="Open navigation" onClick={() => setRailOpen(true)}>
            <Menu size={18} />
          </button>
          <Link href="/" className="font-display text-[15px] font-bold text-navy">MB Intelligence</Link>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[11px] text-muted sm:inline">Core · 250–999 · planning</span>
          <span className="flex-1" />
          <span className="hidden text-xs text-muted lg:inline">{email}</span>
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'open-ask' })}>
            <Sparkles size={14} /> Ask
          </Button>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav className={`${railOpen ? 'absolute inset-x-0 top-[52px] z-20 h-[calc(100vh-52px)] w-full' : 'hidden'} shrink-0 border-r border-line bg-white p-3 md:static md:block md:h-auto md:w-64`} aria-label="Workspace">
            <div className="mb-2 flex items-center justify-between md:hidden">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Workspace</p>
              <button type="button" aria-label="Close navigation" className="rounded-md p-1 text-muted hover:bg-paper" onClick={() => setRailOpen(false)}><X size={16} /></button>
            </div>
            <p className="hidden px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted md:block">Workspace</p>
            {RAIL.map((item, index) => {
              const Icon = ICONS[index] || Compass;
              const on = item.match(pathname);
              return (
                <Link key={item.href} href={item.href} className={`mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium ${on ? 'bg-mist text-accent' : 'text-ink hover:bg-paper'}`}>
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
            <button type="button" onClick={() => dispatch({ type: 'open-ask' })} className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-paper">
              <Sparkles size={16} /> Ask AI
            </button>
            {admin ? <Link href="/council" className={`mt-6 block rounded-md px-2.5 py-2 text-sm font-medium ${pathname === '/council' ? 'bg-mist text-accent' : 'text-muted hover:bg-paper'}`}>Council</Link> : null}
            <form action="/api/auth/logout" method="post" className="mt-4 px-2">
              <button type="submit" className="text-xs text-muted hover:text-navy">Sign out</button>
            </form>
          </nav>
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">{children}</main>
        </div>
        <aside className={`fixed bottom-0 right-0 top-[52px] z-30 flex w-full min-w-0 flex-col overflow-hidden border-l border-line bg-white shadow-card transition-transform duration-200 md:w-96 ${open ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`} aria-hidden={!open}>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-bold text-navy">{drawer.kind === 'detail' ? drawer.detail.title : 'Ask'}</h2>
            <button type="button" className="ml-auto rounded-md p-1 text-muted hover:bg-paper" aria-label="Close panel" onClick={() => dispatch({ type: 'close' })}>
              <X size={18} />
            </button>
          </div>
          {drawer.kind === 'ask' ? <AskPanel /> : null}
          {drawer.kind === 'detail' ? <DetailBody detail={drawer.detail} /> : null}
        </aside>
      </div>
    </DrawerContext.Provider>
  );
}

function DetailBody({ detail }: { detail: Detail }) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{detail.kicker}</p>
      {detail.image ? <div className="mt-3 overflow-hidden rounded-xl border border-line"><Capture src={detail.image} alt={detail.title} tall /></div> : null}
      <div className="mt-3 space-y-2 break-words text-sm leading-6">
        {detail.lines.map((line) => <p key={line}>{line}</p>)}
      </div>
      <dl className="mt-4 space-y-2">
        {detail.facts.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-line px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted">{fact.label}</dt>
            <dd className="break-words text-sm text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

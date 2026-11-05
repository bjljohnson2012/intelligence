import Link from 'next/link';

export function PageTabs({ tabs, current }: { tabs: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Section" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const on = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${on ? 'border-accent bg-mist text-navy' : 'border-transparent text-muted hover:text-navy'}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageIntro({ kicker, title, lede }: { kicker: string; title: string; lede?: string }) {
  return (
    <header className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{kicker}</p>
      <h1 className="mt-1 font-display text-[1.65rem] font-bold leading-tight tracking-tight text-navy">{title}</h1>
      {lede ? <p className="mt-2 max-w-3xl text-sm leading-6 text-ink">{lede}</p> : null}
    </header>
  );
}

export function SourceNote({ children }: { children: string }) {
  return <p className="mt-6 border-l-2 border-accent bg-mist px-3 py-2 text-xs leading-5 text-ink">{children}</p>;
}

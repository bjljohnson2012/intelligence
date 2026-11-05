import { ExternalLink } from 'lucide-react';
import { NOTION_DASHBOARD_HREF, NOTION_DASHBOARD_LABEL } from '@shared/notion-bridge.mjs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type NotionCtaProps = {
  tone?: 'primary' | 'ghost';
  arrow?: boolean;
  size?: 'sm' | 'default';
  className?: string;
};

export function NotionCta({ tone = 'primary', arrow = false, size = 'default', className }: NotionCtaProps) {
  return (
    <Button variant={tone === 'ghost' ? 'outline' : 'notion'} size={size} asChild className={cn('whitespace-nowrap', className)}>
      <a href={NOTION_DASHBOARD_HREF} target="_blank" rel="noopener">
        {NOTION_DASHBOARD_LABEL}
        {arrow ? <span aria-hidden="true"> →</span> : null}
      </a>
    </Button>
  );
}

export function NotionRailLink() {
  return (
    <a
      href={NOTION_DASHBOARD_HREF}
      target="_blank"
      rel="noopener"
      className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-navy hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ExternalLink size={16} aria-hidden="true" />
      {NOTION_DASHBOARD_LABEL}
    </a>
  );
}

export function PackSourceFooter({ children }: { children: string }) {
  return (
    <footer className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line bg-[#FAFAF9] px-4 py-3.5 text-xs leading-5 text-muted max-[800px]:items-stretch">
      <p className="min-w-[12rem] flex-1">{children}</p>
      <NotionCta tone="ghost" className="max-[800px]:w-full" />
    </footer>
  );
}

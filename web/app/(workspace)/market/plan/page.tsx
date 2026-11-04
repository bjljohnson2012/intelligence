import { MARKET_TABS } from '@/lib/nav';
import { loadPlan } from '@/lib/pack';
import { PlanBoard } from '@/components/plan-board';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function PlanPage() {
  const plan = loadPlan();
  const counts = [
    { label: 'Core accounts', value: plan.counts.coreAccts },
    { label: 'Commercial Plus accounts', value: plan.counts.plusAccts },
    { label: 'Enterprise accounts', value: plan.counts.entAccts },
  ];
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Market & TAM" title="2027 plan" lede={plan.summary} />
      <PageTabs tabs={MARKET_TABS} current="/market/plan" />
      <p className="mb-4 text-sm text-muted">{plan.asOf}. {plan.title}. Commercial Plus is not a section here.</p>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {counts.map((item) => (
          <article key={item.label} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-xs text-muted">{item.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-navy">{item.value.toLocaleString('en-US')}</p>
          </article>
        ))}
      </div>
      <PlanBoard rows={plan.milestones} />
      <SourceNote>{plan.source}</SourceNote>
    </div>
  );
}

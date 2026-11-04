import { INTEL_TABS } from '@/lib/nav';
import { loadCompetitors } from '@/lib/pack';
import { CompetitorGrid } from '@/components/competitor-grid';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function CompetitorsPage() {
  const data = loadCompetitors();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Competitive Intel" title="Competitors" lede="Each card is the same size. The mark is a letter tile because logo rights are Explicit Unknown. Click a card for the longer note." />
      <PageTabs tabs={INTEL_TABS} current="/intel/competitors" />
      <CompetitorGrid rivals={data.rivals} claims={data.claims} />
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

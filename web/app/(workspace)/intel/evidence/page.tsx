import { INTEL_TABS } from '@/lib/nav';
import { loadEvidence } from '@/lib/pack';
import { EvidenceBrowser } from '@/components/evidence-browser';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function EvidencePage() {
  const data = loadEvidence();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Competitive Intel" title="Evidence" lede="Marketing pages, eight at a time. Click a title for the decision. These are not logged-in church admin screens." />
      <PageTabs tabs={INTEL_TABS} current="/intel/evidence" />
      <EvidenceBrowser rows={data.rows} />
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

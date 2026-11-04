import { INTEL_TABS } from '@/lib/nav';
import { loadSuite } from '@/lib/pack';
import { SuiteView } from '@/components/suite-view';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function SuitePage() {
  const data = loadSuite();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageIntro kicker="Competitive Intel" title="Suite" lede={data.proof} />
      <PageTabs tabs={INTEL_TABS} current="/intel/suite" />
      <SuiteView modules={data.modules} />
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

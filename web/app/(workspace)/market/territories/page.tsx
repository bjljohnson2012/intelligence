import { MARKET_TABS } from '@/lib/nav';
import { censusFeatures } from '@/lib/geo';
import { loadTerritories } from '@/lib/pack';
import { TerritoryMap } from '@/components/territory-map';
import { PageIntro, PageTabs, SourceNote } from '@/components/page-tabs';

export default function TerritoriesPage() {
  const data = loadTerritories();
  const geo = censusFeatures(data.assignments, (id) => data.territories.find((row) => row.id === id)?.region || 'Explicit Unknown');
  return (
    <div>
      <PageIntro kicker="Market & TAM" title="Territories" lede="Click a state for the territories that name it, their quota, and whether the state is shared. Filters use the plan's rep, profile, and quota grade." />
      <PageTabs tabs={MARKET_TABS} current="/market/territories" />
      <TerritoryMap features={geo.features} territories={data.territories} missing={geo.missing} />
      <SourceNote>{data.source}</SourceNote>
    </div>
  );
}

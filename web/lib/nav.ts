export const MARKET_TABS = [
  { href: '/', label: 'Overview' },
  { href: '/market/plan', label: '2027 plan' },
  { href: '/market/territories', label: 'Territories' },
];

export const INTEL_TABS = [
  { href: '/intel/competitors', label: 'Competitors' },
  { href: '/intel/suite', label: 'Suite' },
  { href: '/intel/evidence', label: 'Evidence' },
];

export const EXEC_TABS = [
  { href: '/execution/seats', label: 'Seats' },
  { href: '/execution/plus', label: 'Commercial Plus' },
  { href: '/execution/implementation', label: 'Implementation' },
  { href: '/execution/buyers', label: 'Buyers' },
];

export const RAIL = [
  { href: '/', label: 'Market & TAM', match: (path: string) => path === '/' || path.startsWith('/market') },
  { href: '/intel/competitors', label: 'Competitive Intel', match: (path: string) => path.startsWith('/intel') },
  { href: '/execution/seats', label: 'Execution Pipeline', match: (path: string) => path.startsWith('/execution') },
];

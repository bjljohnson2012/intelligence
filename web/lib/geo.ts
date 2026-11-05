import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';

const require = createRequire(import.meta.url);

const FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY', '72': 'PR',
};

export type MapFeature = {
  type: 'Feature';
  id: string;
  properties: {
    abbr: string;
    name: string;
    region: string;
    primary: number;
    territories: number[];
    overlap: number;
  };
  geometry: Geometry;
};

export type StateAssignment = {
  abbr: string;
  terrs: number[];
  primary: number;
};

export function censusFeatures(assignments: Record<string, StateAssignment>, regionOf: (id: number) => string) {
  const topology = require('us-atlas/states-10m.json') as Topology;
  const object = topology.objects.states;
  if (!object) return { features: [] as MapFeature[], missing: Object.keys(assignments) };
  const collection = feature(topology, object) as unknown as FeatureCollection;
  const features: MapFeature[] = [];
  const seen = new Set<string>();
  for (const item of collection.features) {
    const abbr = FIPS[String(item.id)];
    const assignment = abbr ? assignments[abbr] : undefined;
    if (!abbr || !assignment || !item.geometry) continue;
    seen.add(abbr);
    features.push({
      type: 'Feature',
      id: abbr,
      properties: {
        abbr,
        name: String(item.properties && 'name' in item.properties ? item.properties.name : abbr),
        region: regionOf(assignment.primary),
        primary: assignment.primary,
        territories: assignment.terrs,
        overlap: assignment.terrs.length > 1 ? 1 : 0,
      },
      geometry: item.geometry,
    });
  }
  const missing = Object.keys(assignments).filter((abbr) => !seen.has(abbr));
  return { features, missing };
}

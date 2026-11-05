'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import type { MapFeature } from '@/lib/geo';
import type { Territory } from '@/lib/pack';
import { Pager } from '@/components/plan-board';

type Props = {
  features: MapFeature[];
  territories: Territory[];
  missing: string[];
};

const PAGE = 8;

function mapData(features: MapFeature[], active: boolean, selected: string, matches: (id: number) => boolean) {
  return {
    type: 'FeatureCollection' as const,
    features: features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        shown: !active || feature.properties.territories.some((id) => matches(id)) ? 1 : 0,
        picked: feature.properties.abbr === selected ? 1 : 0,
      },
    })),
  };
}

function boundsOf(features: MapFeature[]) {
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  const walk = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      const lon = value[0];
      const lat = value[1];
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      return;
    }
    for (const part of value) walk(part);
  };
  for (const feature of features) {
    if ('coordinates' in feature.geometry) walk(feature.geometry.coordinates);
  }
  if (west > east || south > north) return null;
  return [[west, south], [east, north]] as [[number, number], [number, number]];
}

export function TerritoryMap({ features, territories, missing }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState('');
  const [rep, setRep] = useState('');
  const [segment, setSegment] = useState('');
  const [grade, setGrade] = useState('');
  const [page, setPage] = useState(1);
  const byId = useMemo(() => new Map(territories.map((row) => [row.id, row])), [territories]);
  const reps = useMemo(() => [...new Set(territories.map((row) => row.person))], [territories]);
  const segments = useMemo(() => [...new Set(territories.map((row) => row.profile))], [territories]);
  const grades = useMemo(() => [...new Set(territories.map((row) => row.grade))], [territories]);

  function matches(id: number) {
    const row = byId.get(id);
    if (!row) return false;
    if (rep && row.person !== rep) return false;
    if (segment && row.profile !== segment) return false;
    if (grade && row.grade !== grade) return false;
    return true;
  }

  const active = Boolean(rep || segment || grade);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let map: MlMap | null = null;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !host.current) return;
      map = new maplibregl.Map({
        container: host.current,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#E7EEF6' } }],
        },
        attributionControl: false,
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => {
        if (!map) return;
        map.addSource('states', { type: 'geojson', data: mapData(features, false, '', () => true) });
        map.addLayer({
          id: 'states-fill',
          type: 'fill',
          source: 'states',
          paint: {
            'fill-color': ['case', ['==', ['get', 'shown'], 0], '#D9E2EC', ['match', ['get', 'region'], 'West', '#0A5BCC', 'Central', '#0F3E80', 'South', '#127A3E', 'East', '#5C4D7A', '#94A3B8']],
            'fill-opacity': ['case', ['==', ['get', 'shown'], 0], 0.45, ['==', ['get', 'overlap'], 1], 0.78, 0.92],
          },
        });
        map.addLayer({
          id: 'states-line',
          type: 'line',
          source: 'states',
          paint: {
            'line-color': ['case', ['==', ['get', 'picked'], 1], '#0F3E80', ['==', ['get', 'overlap'], 1], '#FF6200', '#ffffff'],
            'line-width': ['case', ['==', ['get', 'picked'], 1], 2.4, ['==', ['get', 'overlap'], 1], 1.5, 0.7],
          },
        });
        const continental = features.filter((item) => item.properties.abbr !== 'AK' && item.properties.abbr !== 'HI');
        const box = boundsOf(continental);
        if (box) map.fitBounds(box, { padding: 24, animate: false });
        map.on('click', 'states-fill', (event) => {
          const props = event.features?.[0]?.properties;
          if (!props || Number(props.shown) === 0) return;
          if (typeof props.abbr === 'string') setSelected(props.abbr);
        });
        map.on('mouseenter', 'states-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'states-fill', () => { if (map) map.getCanvas().style.cursor = ''; });
        mapRef.current = map;
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('states') as { setData?: (data: ReturnType<typeof mapData>) => void } | undefined;
    source?.setData?.(mapData(features, active, selected, matches));
  }, [active, features, grade, ready, rep, segment, selected, territories]);

  const chosen = features.find((feature) => feature.id === selected) || null;
  const rows = territories.filter((row) => !active || matches(row.id));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Filter label="Rep" value={rep} options={reps} all="All reps" onChange={(value) => { setRep(value); setPage(1); setSelected(''); }} />
          <Filter label="Segment" value={segment} options={segments} all="All segments" onChange={(value) => { setSegment(value); setPage(1); setSelected(''); }} />
          <Filter label="Quota grade" value={grade} options={grades} all="All grades" onChange={(value) => { setGrade(value); setPage(1); setSelected(''); }} />
        </div>
        <div ref={host} className="h-[420px] overflow-hidden rounded-xl border border-line bg-[#E7EEF6] sm:h-[520px]" />
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#0A5BCC]" />West</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#0F3E80]" />Central</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#127A3E]" />South</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#5C4D7A]" />East</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm border border-[#FF6200]" />Overlap · boundary inside the state is Explicit Unknown</span>
        </div>
        {missing.length ? <p className="mt-2 text-xs text-hold">No Census shape for {missing.join(', ')}. Geography for those codes is Explicit Unknown.</p> : null}
      </div>
      <aside className="rounded-xl border border-line bg-white p-4 shadow-card">
        {chosen ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{chosen.properties.name}</p>
            <h2 className="mt-1 font-display text-lg font-bold text-navy">{chosen.properties.abbr} · {chosen.properties.region}</h2>
            {chosen.properties.overlap === 1 ? <p className="mt-2 text-sm leading-6">More than one territory names this state. The line inside the state is Explicit Unknown.</p> : <p className="mt-2 text-sm leading-6">One territory is primary for this state.</p>}
            <ul className="mt-3 space-y-2">
              {chosen.properties.territories.map((id) => {
                const row = byId.get(id);
                if (!row) return <li key={id}>Territory {id} · Explicit Unknown</li>;
                return (
                  <li key={id} className="rounded-lg bg-paper px-3 py-2 text-sm">
                    <b className="font-display text-navy">T{row.id}</b> {row.person} · {row.seat}
                    <span className="mt-1 block text-xs text-muted">Quota {row.quota.toLocaleString('en-US')} · grade {row.grade} · {row.profile} · MQL {row.mql}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : <p className="text-sm leading-6 text-muted">Click a state. Overlap and quota come from the 2027 plan. Alaska and Hawaii are in the file; the opening view is the lower 48 and Puerto Rico so the states stay readable.</p>}
      </aside>
      <div className="lg:col-span-2">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Territory</th><th className="px-3 py-2">States</th><th className="px-3 py-2">Rep</th><th className="px-3 py-2">Segment</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Quota</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-navy">T{row.id} · {row.region}</td>
                  <td className="px-3 py-2">{row.states}</td>
                  <td className="px-3 py-2">{row.person}</td>
                  <td className="px-3 py-2">{row.profile}</td>
                  <td className="px-3 py-2">{row.grade}</td>
                  <td className="px-3 py-2">{row.quota.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </div>
    </div>
  );
}

function Filter({ label, value, options, all, onChange }: { label: string; value: string; options: string[]; all: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs text-muted">
      <span className="mr-1">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-sm text-ink">
        <option value="">{all}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export const LAYER_KEYS = [
  'wards',
  'stale',
  'councillors',
  'notices',
  'events',
  'hmos',
  'planning',
  'planningHmo',
  'flood',
  'collisions',
  'trafficCams',
  'prow',
  'air',
  'eco'
] as const;

export type LayerKey = (typeof LAYER_KEYS)[number];

export type LayerFlags = Record<LayerKey, boolean>;

export const MAP_VIEWS = [
  {
    id: 'overview',
    label: 'Overview',
    hint: 'Default mix: wards, notices, events, councillors, stale, HMO, traffic cams, eco works'
  },
  {
    id: 'events',
    label: 'Events',
    hint: 'Events and notices as map pins'
  },
  {
    id: 'streets',
    label: 'Streets & reports',
    hint: 'Stale open reports, collisions, council notices'
  },
  {
    id: 'housing',
    label: 'Housing',
    hint: 'Licensed HMOs and planning applications'
  },
  {
    id: 'travel',
    label: 'Travel & roads',
    hint: 'Traffic cams, collisions, paths, notices'
  },
  {
    id: 'green',
    label: 'Green & flood',
    hint: 'Eco works, flood, paths, air quality'
  }
] as const;

export type ViewId = (typeof MAP_VIEWS)[number]['id'];

export type MapViewSelection = ViewId | 'custom';

export const LAYER_META: Record<LayerKey, { label: string; activeClass: string }> = {
  wards: { label: 'Wards', activeClass: 'bg-[#1d4ed8] text-paper' },
  stale: { label: 'Stale', activeClass: 'bg-[#c2410c] text-paper' },
  councillors: { label: 'Councillors', activeClass: 'bg-[#2f4a34] text-paper' },
  notices: { label: 'Notices', activeClass: 'bg-[#0f766e] text-paper' },
  events: { label: 'Events', activeClass: 'bg-[#b45309] text-paper' },
  hmos: { label: 'HMO', activeClass: 'bg-[#5b2c6f] text-paper' },
  planning: { label: 'Planning', activeClass: 'bg-[#1a5276] text-paper' },
  planningHmo: { label: 'HMO planning', activeClass: 'bg-[#6c3483] text-paper' },
  flood: { label: 'Flood', activeClass: 'bg-[#2874a6] text-paper' },
  collisions: { label: 'Collisions', activeClass: 'bg-[#922b21] text-paper' },
  trafficCams: { label: 'Traffic cams', activeClass: 'bg-[#ca6f1e] text-paper' },
  prow: { label: 'Paths', activeClass: 'bg-[#196f3d] text-paper' },
  air: { label: 'Air', activeClass: 'bg-[#0e6655] text-paper' },
  eco: { label: 'Eco works', activeClass: 'bg-[#15803d] text-paper' }
};

const off: LayerFlags = {
  wards: false,
  stale: false,
  councillors: false,
  notices: false,
  events: false,
  hmos: false,
  planning: false,
  planningHmo: false,
  flood: false,
  collisions: false,
  trafficCams: false,
  prow: false,
  air: false,
  eco: false
};

export const VIEW_LAYERS: Record<ViewId, LayerFlags> = {
  overview: {
    ...off,
    wards: true,
    stale: true,
    councillors: true,
    notices: true,
    events: true,
    hmos: true,
    trafficCams: true,
    eco: true
  },
  events: {
    ...off,
    wards: true,
    events: true,
    notices: true
  },
  streets: {
    ...off,
    wards: true,
    stale: true,
    notices: true,
    collisions: true
  },
  housing: {
    ...off,
    wards: true,
    stale: true,
    hmos: true,
    planning: true,
    planningHmo: true
  },
  travel: {
    ...off,
    wards: true,
    stale: true,
    notices: true,
    trafficCams: true,
    collisions: true,
    prow: true
  },
  green: {
    ...off,
    wards: true,
    stale: true,
    eco: true,
    flood: true,
    prow: true,
    air: true
  }
};

export const DEFAULT_VIEW: ViewId = 'overview';
export const DEFAULT_LAYERS: LayerFlags = VIEW_LAYERS[DEFAULT_VIEW];

export function flagsMatch(a: LayerFlags, b: LayerFlags): boolean {
  return LAYER_KEYS.every((key) => a[key] === b[key]);
}

export function viewForLayers(layers: LayerFlags): MapViewSelection {
  const found = MAP_VIEWS.find((view) => flagsMatch(layers, VIEW_LAYERS[view.id]));
  return found?.id ?? 'custom';
}

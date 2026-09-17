export const REPORT_TYPES = ['pothole', 'litter', 'lighting', 'asb', 'other'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportOrigin = 'fixmystreet' | 'community';

export type Report = {
  id: string;
  title: string;
  loc: string;
  area: string;
  lat: number | null;
  lng: number | null;
  type: ReportType;
  severity: 'high' | 'normal' | string;
  ts: number;
  time: string;
  url: string;
  media: string | null;
  desc: string;
  source: string;
  origin: ReportOrigin;
};

export type CommunityTip = {
  id: string;
  title: string;
  loc: string;
  area: string;
  type: ReportType | string;
  lat: number | null;
  lng: number | null;
  url: string;
  media: string;
  desc: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
};

export type ReportsPayload = {
  updated: string | null;
  count: number;
  reports: Report[];
};

export type FeedSource = 'railway' | 'restore';


export type HmoRecord = {
  id: string;
  houseNumber: string;
  address: string;
  postcode: string;
  permitted: number | string;
  expires: string;
  lat: number;
  lng: number;
  geocode?: string;
};

export type HmoPayload = {
  source: string;
  sourceUrl: string;
  registerPdf: string;
  extractedAt: string;
  filter: string;
  note: string;
  hmos: HmoRecord[];
};


export type PlanningApp = {
  id: string;
  ref: string;
  title: string;
  address: string;
  postcode: string;
  status: string;
  url: string;
  lat: number;
  lng: number;
  kind?: 'hmo' | 'general';
};

export type FloodArea = {
  id: string;
  label: string;
  description: string;
  riverOrSea: string;
  county: string;
  fwdCode: string;
  lat: number;
  lng: number;
  url: string;
};

export type FloodWarning = {
  id: string;
  severity: string;
  severityLevel: number;
  description: string;
  message: string;
  lat: number | null;
  lng: number | null;
  url: string;
  areaName: string;
};


export type CollisionRecord = {
  id: string;
  ref: string;
  lat: number;
  lng: number;
  severity: string;
  severity_label: string;
  date: string;
  time: string;
  casualties: number | string;
  vehicles: number | string;
  road: string;
  speed_limit: string;
};

export type TrafficCamera = {
  id: string;
  name: string;
  road: string;
  direction: string;
  junction: string;
  lat: number;
  lng: number;
  url: string;
  source: string;
};

export type AirStation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  url: string;
  pollutant_series?: string;
};

export type WardSlug = 'east' | 'west';

export type WardCentroid = {
  lat: number;
  lng: number;
};

export type WardProperties = {
  name: string;
  slug: WardSlug;
  gss: string;
  mapitId: number;
  mapitUrl?: string;
  centroid?: WardCentroid;
};

export type WardCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, WardProperties>;

export type Councillor = {
  id: string;
  name: string;
  party: string;
  ward: string;
  wardSlug: WardSlug;
  email: string | null;
  phone: string | null;
  profileUrl: string;
  note?: string;
};

export type CouncillorsPayload = {
  source: string;
  sourceUrl: string;
  findMemberUrl?: string;
  extractedAt: string;
  asOf?: string;
  note: string;
  councillors: Councillor[];
};

export type StaleTier = 'stale' | 'very';

export type StaleReport = {
  report: Report & { lat: number; lng: number };
  ageDays: number;
  tier: StaleTier;
  ts: number;
};

export type EcoWorkStatus = 'planned' | 'ongoing';

export type EcoWorkGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] };

export type EcoWork = {
  id: string;
  title: string;
  status: EcoWorkStatus;
  summary: string;
  source: string;
  sourceUrl: string;
  area: string;
  lat: number;
  lng: number;
  geometry?: EcoWorkGeometry;
};

export type EcoWorksPayload = {
  source: string;
  sourceUrl: string;
  extractedAt: string;
  note: string;
  works: EcoWork[];
};

export type CouncilNotice = {
  id: string;
  title: string;
  date: string;
  summary: string;
  sourceUrl: string;
  area?: string;
  lat?: number;
  lng?: number;
};

export type CouncilNoticesPayload = {
  source: string;
  sourceUrl: string;
  extractedAt: string;
  note: string;
  notices: CouncilNotice[];
};


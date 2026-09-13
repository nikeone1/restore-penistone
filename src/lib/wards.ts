import type { Councillor, WardCollection, WardProperties, WardSlug } from './types';

export const WARD_STYLE: Record<WardSlug, { color: string; fillColor: string; label: string }> = {
  east: { color: '#b45309', fillColor: '#d97706', label: 'Penistone East' },
  west: { color: '#1d4ed8', fillColor: '#3b82f6', label: 'Penistone West' }
};

function pointInRing(lng: number, lat: number, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denom = yj - yi;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (denom || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng: number, lat: number, coords: GeoJSON.Position[][]): boolean {
  const [outer, ...holes] = coords;
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  return holes.every((hole) => !pointInRing(lng, lat, hole));
}

export function pointInWardGeometry(lng: number, lat: number, geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  if (geom.type === 'Polygon') return pointInPolygonCoords(lng, lat, geom.coordinates);
  return geom.coordinates.some((poly) => pointInPolygonCoords(lng, lat, poly));
}

export function wardForPoint(lng: number, lat: number, wards: WardCollection | null): WardProperties | null {
  if (!wards) return null;
  for (const feature of wards.features) {
    if (feature.geometry && pointInWardGeometry(lng, lat, feature.geometry)) {
      return feature.properties;
    }
  }
  return null;
}

export function councillorsForWard(councillors: Councillor[], slug: WardSlug | null | undefined): Councillor[] {
  if (!slug) return [];
  return councillors.filter((c) => c.wardSlug === slug);
}

export function wardCentroids(wards: WardCollection | null): { slug: WardSlug; name: string; lat: number; lng: number }[] {
  if (!wards) return [];
  return wards.features.flatMap((feature) => {
    const c = feature.properties?.centroid;
    if (!c) return [];
    return [{ slug: feature.properties.slug, name: feature.properties.name, lat: c.lat, lng: c.lng }];
  });
}

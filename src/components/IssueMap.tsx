import { Fragment, useEffect, useRef } from 'react';
import { geoJSON as leafletGeoJSON, type Layer } from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PENISTONE, isMapped } from '../lib/api';
import { TYPE_COLOR, TYPE_LABEL, formatWhen, streetLabel } from '../lib/analytics';
import { formatRelative, recencyPinStyle, reportAgeDays } from '../lib/recency';
import { staleStyle } from '../lib/stale';
import { WARD_STYLE, councillorsForWard, wardCentroids, wardForPoint } from '../lib/wards';
import type {
  AirStation,
  CollisionRecord,
  Councillor,
  EcoWork,
  FloodArea,
  FloodWarning,
  HmoRecord,
  PlanningApp,
  Report,
  ReportType,
  StaleReport,
  TrafficCamera,
  WardCollection,
  WardProperties,
  WardSlug
} from '../lib/types';

type Props = {
  reports: Report[];
  selectedId: string | null;
  onSelect: (report: Report) => void;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickPoint?: { lat: number; lng: number } | null;
  hmos?: HmoRecord[];
  showHmos?: boolean;
  planning?: PlanningApp[];
  showPlanning?: boolean;
  planningHmo?: PlanningApp[];
  showPlanningHmo?: boolean;
  floodAreas?: FloodArea[];
  floodWarnings?: FloodWarning[];
  showFlood?: boolean;
  collisions?: CollisionRecord[];
  showCollisions?: boolean;
  trafficCams?: TrafficCamera[];
  showTrafficCams?: boolean;
  prow?: GeoJSON.FeatureCollection | null;
  showProw?: boolean;
  airStations?: AirStation[];
  showAir?: boolean;
  wards?: WardCollection | null;
  showWards?: boolean;
  stale?: StaleReport[];
  showStale?: boolean;
  councillors?: Councillor[];
  showCouncillors?: boolean;
  ecoWorks?: EcoWork[];
  showEco?: boolean;
};

function ClickCatcher({ enabled, onPick }: { enabled: boolean; onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      if (enabled && onPick) onPick(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

function provenance(report: Report): { label: string; href?: string } {
  if (report.origin === 'community') return { label: 'Community tip', href: report.url || undefined };
  return { label: 'FixMyStreet', href: report.url || undefined };
}

function wardPathStyle(feature?: { properties?: { slug?: WardSlug } | null }) {
  const slug = feature?.properties?.slug === 'west' ? 'west' : 'east';
  const style = WARD_STYLE[slug];
  return { color: style.color, weight: 3, fillColor: style.fillColor, fillOpacity: 0.22 };
}

function FitWardsOnce({ wards }: { wards: WardCollection | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !wards) return;
    const bounds = leafletGeoJSON(wards).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
      done.current = true;
    }
  }, [map, wards]);
  return null;
}

function bindWardPopup(feature: { properties?: Partial<WardProperties> | null }, layer: Layer) {
  const name = feature.properties?.name;
  const gss = feature.properties?.gss;
  const slug = feature.properties?.slug === 'west' ? 'west' : 'east';
  if (!name) return;
  layer.bindPopup(
    `<p class="text-[11px] font-semibold uppercase tracking-wide" style="color:${WARD_STYLE[slug].color}">${name}</p>
     <p class="mt-1 text-xs text-ink/50">MapIt ward · GSS ${gss || ''}</p>`
  );
}

function CaseworkHint({
  report,
  wards,
  councillors
}: {
  report: Report;
  wards: WardCollection | null;
  councillors: Councillor[];
}) {
  if (!wards || !councillors.length || report.lat == null || report.lng == null) return null;
  const ward = wardForPoint(report.lng, report.lat, wards);
  if (!ward) return null;
  const members = councillorsForWard(councillors, ward.slug);
  if (!members.length) return null;
  return (
    <p className="mt-2 text-xs text-ink/55">
      Casework: {ward.name} — {members.map((c) => c.name).join(', ')}
    </p>
  );
}

export function IssueMap({
  reports, selectedId, onSelect, pickMode = false, onPick, pickPoint,
  hmos = [], showHmos = false,
  planning = [], showPlanning = false,
  planningHmo = [], showPlanningHmo = false,
  floodAreas = [], floodWarnings = [], showFlood = false,
  collisions = [], showCollisions = false,
  trafficCams = [], showTrafficCams = false,
  prow = null, showProw = false,
  airStations = [], showAir = false,
  wards = null, showWards = false,
  stale = [], showStale = false,
  councillors = [], showCouncillors = false,
  ecoWorks = [], showEco = false
}: Props) {
  const mapped = reports.filter(isMapped);
  const centroids = showCouncillors ? wardCentroids(wards) : [];
  const staleById = new Map(stale.map((item) => [item.report.id, item]));
  const overlayPins =
    (showHmos && hmos.length > 0) ||
    (showPlanning && planning.length > 0) ||
    (showPlanningHmo && planningHmo.length > 0) ||
    (showFlood && (floodAreas.length > 0 || floodWarnings.length > 0)) ||
    (showCollisions && collisions.length > 0) ||
    (showTrafficCams && trafficCams.length > 0) ||
    (showAir && airStations.length > 0) ||
    (showProw && Boolean(prow)) ||
    (showWards && Boolean(wards)) ||
    (showStale && stale.length > 0) ||
    (showCouncillors && centroids.length > 0) ||
    (showEco && ecoWorks.length > 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <div className="flex items-end justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-moss">Street map</h2>
          <p className="text-sm text-ink/60">
            {mapped.length} issue pin{mapped.length === 1 ? '' : 's'}
            {showHmos ? ` · ${hmos.length} HMO` : ''}
            {showPlanning ? ` · ${planning.length} planning` : ''}
            {showPlanningHmo ? ` · ${planningHmo.length} HMO planning` : ''}
            {showFlood ? ` · ${floodWarnings.length} alert / ${floodAreas.length} flood areas` : ''}
            {showTrafficCams ? ` · ${trafficCams.length} traffic cams` : ''}
            {showWards ? ' · wards' : ''}
            {showStale ? ` · ${stale.length} stale open` : ''}
            {showEco ? ` · ${ecoWorks.length} eco works` : ''}
            {' '}· layers labelled separately
          </p>
        </div>
        {pickMode && (
          <p className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-paper">Tap the map to place your tip</p>
        )}
      </div>
      <div className="relative h-[58vh] min-h-[320px] w-full sm:h-[520px]">
        <MapContainer
          center={[PENISTONE.lat, PENISTONE.lng]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ward boundaries <a href="https://mapit.mysociety.org/">MapIt</a> / OS / ONS'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher enabled={pickMode} onPick={onPick} />
          {wards && <FitWardsOnce wards={wards} />}
          {showWards &&
            wards?.features.map((feature) => (
              <GeoJSON
                key={feature.properties.slug}
                data={feature}
                style={wardPathStyle(feature)}
                onEachFeature={bindWardPopup}
              />
            ))}
          {showStale &&
            stale.map((item) => {
              const heat = staleStyle(item.tier);
              const type = (item.report.type in TYPE_COLOR ? item.report.type : 'other') as ReportType;
              return (
                <CircleMarker
                  key={`stale:${item.report.id}`}
                  center={[item.report.lat, item.report.lng]}
                  radius={heat.radius}
                  pathOptions={{
                    color: heat.color,
                    weight: 1,
                    fillColor: heat.fillColor,
                    fillOpacity: heat.fillOpacity
                  }}
                  eventHandlers={{ click: () => onSelect(item.report) }}
                >
                  <Popup className="restore-popup">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9a3412]">
                      Stale open
                    </p>
                    <p className="mt-1 inline-block rounded-full bg-[#c2410c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                      {item.tier === 'very' ? `${item.ageDays} days · very stale` : `${item.ageDays} days`}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
                      {TYPE_LABEL[type]}
                    </p>
                    <p className="mt-1 font-semibold leading-snug">{item.report.title}</p>
                    <p className="mt-1 text-sm text-ink/70">{streetLabel(item.report.loc)}</p>
                    <p className="text-xs text-ink/50">{formatWhen(item.ts)} · {item.ageDays} day{item.ageDays === 1 ? '' : 's'} open</p>
                    {item.report.url && (
                      <a
                        className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                        href={item.report.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open on FixMyStreet
                      </a>
                    )}
                    <CaseworkHint report={item.report} wards={wards} councillors={councillors} />
                  </Popup>
                </CircleMarker>
              );
            })}
          {mapped.map((report) => {
            const type = (report.type in TYPE_COLOR ? report.type : 'other') as ReportType;
            const selected = report.id === selectedId;
            const community = report.origin === 'community';
            const source = provenance(report);
            const ageDays = reportAgeDays(report);
            const pin = recencyPinStyle(ageDays, { selected, community });
            const hot = ageDays != null && ageDays < 7;
            return (
              <CircleMarker
                key={report.id}
                center={[report.lat, report.lng]}
                radius={pin.radius}
                pathOptions={{
                  color: pin.color,
                  weight: pin.weight,
                  fillColor: TYPE_COLOR[type],
                  fillOpacity: pin.fillOpacity,
                  dashArray: community ? '1 0' : undefined
                }}
                eventHandlers={{ click: () => onSelect(report) }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
                    {TYPE_LABEL[type]}
                  </p>
                  <p className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper" style={{ background: community ? '#2f4a34' : '#5c6b73' }}>
                    {source.label}
                  </p>
                  {hot && (
                    <p className="mt-1 inline-block rounded-full bg-moss px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                      New · {formatRelative(report.ts)}
                    </p>
                  )}
                  {staleById.has(report.id) && (
                    <p className="mt-1 inline-block rounded-full bg-[#c2410c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                      Stale open · {staleById.get(report.id)?.ageDays} days
                    </p>
                  )}
                  <p className="mt-1 font-semibold leading-snug">{report.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{streetLabel(report.loc)}</p>
                  <p className="text-xs text-ink/50">{formatRelative(report.ts)} · {formatWhen(report.ts)} · {report.area}</p>
                  {report.desc && community && <p className="mt-2 text-sm">{report.desc}</p>}
                  {report.media && <img src={report.media} alt="" />}
                  {source.href && (
                    <a
                      className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {community ? 'Open submitted link' : 'Open on FixMyStreet'}
                    </a>
                  )}
                  <CaseworkHint report={report} wards={wards} councillors={councillors} />
                </Popup>
              </CircleMarker>
            );
          })}

          {showHmos &&
            hmos.map((hmo) => (
              <CircleMarker
                key={hmo.id}
                center={[hmo.lat, hmo.lng]}
                radius={10}
                pathOptions={{
                  color: '#5b2c6f',
                  weight: 2.5,
                  fillColor: '#8e44ad',
                  fillOpacity: 0.85
                }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5b2c6f]">Licensed HMO</p>
                  <p className="mt-1 inline-block rounded-full bg-[#5b2c6f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Barnsley register
                  </p>
                  <p className="mt-1 font-semibold leading-snug">
                    {hmo.houseNumber}, {hmo.address}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">{hmo.postcode}</p>
                  <p className="text-xs text-ink/50">
                    Permitted {hmo.permitted} · Expires {hmo.expires}
                  </p>
                  <a
                    className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                    href="https://www.barnsley.gov.uk/services/housing/private-landlords/houses-in-multiple-occupation-hmo/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Council HMO page
                  </a>
                  <br />
                  <a
                    className="inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                    href="https://www.barnsley.gov.uk/media/zebimlz3/hmo-register.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public register PDF
                  </a>
                </Popup>
              </CircleMarker>
            ))}


          {showPlanning &&
            planning.map((app) => (
              <CircleMarker
                key={app.id}
                center={[app.lat, app.lng]}
                radius={8}
                pathOptions={{ color: '#1a5276', weight: 2, fillColor: '#3498db', fillOpacity: 0.85 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1a5276]">Planning</p>
                  <p className="mt-1 inline-block rounded-full bg-[#1a5276] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Barnsley Planning Explorer
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{app.ref}</p>
                  <p className="mt-1 text-sm">{app.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{app.address}</p>
                  <p className="text-xs text-ink/50">{app.status}</p>
                  <a className="mt-1 inline-block text-sm font-semibold text-moss underline" href={app.url} target="_blank" rel="noreferrer">
                    Open application
                  </a>
                </Popup>
              </CircleMarker>
            ))}
          
          {showPlanningHmo &&
            planningHmo.map((app) => (
              <CircleMarker
                key={app.id}
                center={[app.lat, app.lng]}
                radius={9}
                pathOptions={{ color: '#6c3483', weight: 2.5, fillColor: '#af7ac5', fillOpacity: 0.9 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6c3483]">HMO planning</p>
                  <p className="mt-1 inline-block rounded-full bg-[#6c3483] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Not the licence register
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{app.ref}</p>
                  <p className="mt-1 text-sm">{app.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{app.address}</p>
                  <p className="text-xs text-ink/50">{app.status}</p>
                  <a className="mt-1 inline-block text-sm font-semibold text-moss underline" href={app.url} target="_blank" rel="noreferrer">
                    Open application
                  </a>
                </Popup>
              </CircleMarker>
            ))}

          
          {showCollisions &&
            collisions.map((c) => (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={c.severity_label === 'Fatal' ? 11 : c.severity_label === 'Serious' ? 9 : 6}
                pathOptions={{
                  color: '#7b241c',
                  weight: 1.5,
                  fillColor: c.severity_label === 'Fatal' ? '#922b21' : c.severity_label === 'Serious' ? '#e74c3c' : '#f5b7b1',
                  fillOpacity: 0.85
                }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7b241c]">Collision (STATS19)</p>
                  <p className="mt-1 font-semibold">{c.severity_label}</p>
                  <p className="text-sm text-ink/70">{c.date} {c.time}</p>
                  <p className="text-xs text-ink/50">{c.casualties} casualties · {c.vehicles} vehicles · limit {c.speed_limit}</p>
                  <p className="text-xs text-ink/45 mt-1">DfT open data · injury collisions reported to police</p>
                </Popup>
              </CircleMarker>
            ))}
          {showTrafficCams &&
            trafficCams.map((cam) => (
              <CircleMarker
                key={cam.id}
                center={[cam.lat, cam.lng]}
                radius={9}
                pathOptions={{ color: '#a04000', weight: 2, fillColor: '#e67e22', fillOpacity: 0.9 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a04000]">Traffic camera</p>
                  <p className="mt-1 inline-block rounded-full bg-[#ca6f1e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    National Highways
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{cam.name}</p>
                  <p className="mt-1 text-sm text-ink/70">
                    {cam.road} {cam.direction} · {cam.junction}
                  </p>
                  <p className="text-xs text-ink/50">
                    National Highways motorway traffic CCTV · not town CCTV · viewer via motorwaycameras.co.uk
                  </p>
                  <a
                    className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                    href={cam.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open live camera
                  </a>
                </Popup>
              </CircleMarker>
            ))}
          {showProw && prow && (
            <GeoJSON
              data={prow as GeoJSON.FeatureCollection}
              style={() => ({ color: '#196f3d', weight: 2, opacity: 0.75 })}
            />
          )}
          {showAir &&
            airStations.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={10}
                pathOptions={{ color: '#0e6655', weight: 2, fillColor: '#48c9b0', fillOpacity: 0.85 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0e6655]">Air quality station</p>
                  <p className="mt-1 font-semibold">{s.label}</p>
                  <p className="text-xs text-ink/50">DEFRA UK-AIR · may be outside Penistone</p>
                  <a className="mt-1 inline-block text-sm font-semibold text-moss underline" href={s.url} target="_blank" rel="noreferrer">
                    UK-AIR
                  </a>
                </Popup>
              </CircleMarker>
            ))}

          {showFlood &&
            floodAreas.map((area) => (
              <CircleMarker
                key={area.id}
                center={[area.lat, area.lng]}
                radius={7}
                pathOptions={{ color: '#1a5276', weight: 1.5, fillColor: '#5dade2', fillOpacity: 0.45 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2874a6]">Flood area</p>
                  <p className="mt-1 inline-block rounded-full bg-[#2874a6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Environment Agency
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{area.label}</p>
                  <p className="mt-1 text-sm text-ink/70">{area.description}</p>
                  {area.riverOrSea && <p className="text-xs text-ink/50">{area.riverOrSea}</p>}
                  {area.url && (
                    <a className="mt-1 inline-block text-sm font-semibold text-moss underline" href={area.url} target="_blank" rel="noreferrer">
                      Check for flooding
                    </a>
                  )}
                </Popup>
              </CircleMarker>
            ))}
          {showFlood &&
            floodWarnings.map((w) => (
              <CircleMarker
                key={w.id}
                center={[w.lat ?? 53.525, w.lng ?? -1.628]}
                radius={11}
                pathOptions={{ color: '#7b241c', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.9 }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7b241c]">Flood alert</p>
                  <p className="mt-1 inline-block rounded-full bg-[#c0392b] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    {w.severity}
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{w.description || w.areaName}</p>
                  {w.message && <p className="mt-1 text-sm text-ink/70">{w.message.slice(0, 280)}</p>}
                  {w.url && (
                    <a className="mt-1 inline-block text-sm font-semibold text-moss underline" href={w.url} target="_blank" rel="noreferrer">
                      Official warning
                    </a>
                  )}
                </Popup>
              </CircleMarker>
            ))}

          {showCouncillors &&
            centroids.map((c) => {
              const style = WARD_STYLE[c.slug];
              const members = councillorsForWard(councillors, c.slug);
              return (
                <CircleMarker
                  key={`councillor-ward:${c.slug}`}
                  center={[c.lat, c.lng]}
                  radius={11}
                  pathOptions={{ color: style.color, weight: 3, fillColor: style.fillColor, fillOpacity: 0.95 }}
                >
                  <Popup className="restore-popup">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: style.color }}>
                      {c.name} councillors
                    </p>
                    <p className="mt-1 text-xs text-ink/55">Public contacts · not a marked register</p>
                    <ul className="mt-2 space-y-1">
                      {members.map((m) => (
                        <li key={m.id} className="text-sm">
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-ink/60"> · {m.party}</span>
                        </li>
                      ))}
                    </ul>
                  </Popup>
                </CircleMarker>
              );
            })}

          {showEco &&
            ecoWorks.map((work) => {
              const ongoing = work.status === 'ongoing';
              const line = work.geometry?.type === 'LineString' ? work.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) : null;
              return (
                <Fragment key={work.id}>
                  {line && (
                    <Polyline
                      positions={line}
                      pathOptions={{
                        color: ongoing ? '#15803d' : '#4d7c0f',
                        weight: 4,
                        opacity: 0.82,
                        dashArray: '8 6'
                      }}
                    />
                  )}
                  <CircleMarker
                    center={[work.lat, work.lng]}
                    radius={ongoing ? 10 : 9}
                    pathOptions={{
                      color: ongoing ? '#14532d' : '#3f6212',
                      weight: 2.5,
                      fillColor: ongoing ? '#4ade80' : '#a3e635',
                      fillOpacity: 0.92
                    }}
                  >
                    <Popup className="restore-popup">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#15803d]">Eco works</p>
                      <p
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper"
                        style={{ background: ongoing ? '#15803d' : '#4d7c0f' }}
                      >
                        {ongoing ? 'Ongoing' : 'Planned'}
                      </p>
                      <p className="mt-1 font-semibold leading-snug">{work.title}</p>
                      <p className="mt-1 text-sm text-ink/70">{work.summary}</p>
                      <p className="mt-1 text-xs text-ink/50">{work.area}</p>
                      <p className="mt-2 text-[11px] text-ink/45">
                        Public council / biodiversity plans · approximate locations · not live contractor GPS.
                      </p>
                      <a
                        className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                        href={work.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {work.source}
                      </a>
                    </Popup>
                  </CircleMarker>
                </Fragment>
              );
            })}

          {pickPoint && (
            <CircleMarker
              center={[pickPoint.lat, pickPoint.lng]}
              radius={10}
              pathOptions={{ color: '#2f4a34', weight: 3, fillColor: '#c4782a', fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
        {(showWards || showStale || mapped.length > 0 || showEco) && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[400] max-w-[220px] rounded-xl border border-line bg-paper/95 px-3 py-2 text-[11px] shadow-sm">
            {showWards && (
              <>
                <p className="font-semibold text-ink/70">Wards</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: WARD_STYLE.east.fillColor, outline: `2px solid ${WARD_STYLE.east.color}` }} />
                  Penistone East
                </p>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: WARD_STYLE.west.fillColor, outline: `2px solid ${WARD_STYLE.west.color}` }} />
                  Penistone West
                </p>
              </>
            )}
            {mapped.length > 0 && (
              <>
                <p className={`font-semibold text-ink/70 ${showWards ? 'mt-2' : ''}`}>Newer reports</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-moss" />
                  Last 7 days · larger moss ring
                </p>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#d7d0c2]" />
                  Older · smaller, faded
                </p>
              </>
            )}
            {showStale && (
              <>
                <p className={`font-semibold text-ink/70 ${showWards || mapped.length > 0 ? 'mt-2' : ''}`}>Stale open</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  14+ days still open
                </p>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ea580c]" />
                  45+ days
                </p>
              </>
            )}
            {showEco && (
              <>
                <p className={`font-semibold text-ink/70 ${showWards || showStale || mapped.length > 0 ? 'mt-2' : ''}`}>Eco works</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
                  Ongoing
                </p>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a3e635]" />
                  Planned
                </p>
                <p className="mt-1 text-[10px] leading-snug text-ink/45">Approximate public plans · not contractor GPS</p>
              </>
            )}
          </div>
        )}
        {mapped.length === 0 && !overlayPins && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-stone/70 px-6 text-center">
            <p className="max-w-sm text-sm text-ink/70">
              The map is ready. Markers appear when FixMyStreet reports or approved community tips have coordinates.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

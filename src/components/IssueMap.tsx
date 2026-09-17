import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { geoJSON as leafletGeoJSON, type CircleMarker as LeafletCircleMarker, type Layer } from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PENISTONE, isMapped } from '../lib/api';
import { TYPE_COLOR, TYPE_LABEL, formatWhen, streetLabel } from '../lib/analytics';
import { RECENCY_LEGEND, RECENCY_TIER_LABEL, formatRelative, recencyPinStyle, recencyStrength, recencyTier, reportAgeDays } from '../lib/recency';
import { staleStyle } from '../lib/stale';
import { WARD_STYLE, councillorsForWard, wardCentroids, wardForPoint } from '../lib/wards';
import type {
  AirStation,
  CollisionRecord,
  CommunityEvent,
  CouncilNotice,
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
  notices?: CouncilNotice[];
  showNotices?: boolean;
  selectedNoticeId?: string | null;
  events?: CommunityEvent[];
  showEvents?: boolean;
  selectedEventId?: string | null;
};

function CivicPanes() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('civicPane')) {
      const pane = map.createPane('civicPane');
      pane.style.zIndex = '450';
    }
  }, [map]);
  return null;
}

function CivicPin({
  selected,
  center,
  radius,
  pathOptions,
  children
}: {
  selected: boolean;
  center: [number, number];
  radius: number;
  pathOptions: { color: string; weight: number; fillColor: string; fillOpacity: number };
  children: ReactNode;
}) {
  const ref = useRef<LeafletCircleMarker | null>(null);
  useEffect(() => {
    if (selected) ref.current?.openPopup();
  }, [selected]);
  return (
    <CircleMarker ref={ref} pane="civicPane" center={center} radius={radius} pathOptions={pathOptions}>
      {children}
    </CircleMarker>
  );
}

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

function PanToNotice({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.55 });
  }, [map, lat, lng]);
  return null;
}

function formatNoticeDate(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

type MapKeyProps = {
  showWards: boolean;
  showStale: boolean;
  showEco: boolean;
  showNotices: boolean;
  showEvents: boolean;
  hasReports: boolean;
};

function hasMapKey(props: MapKeyProps): boolean {
  return props.showWards || props.showStale || props.hasReports || props.showEco || props.showNotices || props.showEvents;
}

function MapKeyBody({ showWards, showStale, showEco, showNotices, showEvents, hasReports }: MapKeyProps) {
  return (
    <>
      {showWards && (
        <>
          <p className="font-semibold text-ink/70">Wards</p>
          <p className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: WARD_STYLE.east.fillColor, outline: `2px solid ${WARD_STYLE.east.color}` }}
            />
            Penistone East
          </p>
          <p className="mt-0.5 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: WARD_STYLE.west.fillColor, outline: `2px solid ${WARD_STYLE.west.color}` }}
            />
            Penistone West
          </p>
        </>
      )}
      {hasReports && (
        <>
          <p className={`font-semibold text-ink/70 ${showWards ? 'mt-2' : ''}`}>Report age</p>
          {RECENCY_LEGEND.map((row) => (
            <p key={row.tier} className="mt-1 flex items-center gap-2">
              <span
                className="inline-block shrink-0 rounded-full"
                style={{
                  width: `${5.2 + 7.8 * row.strength}px`,
                  height: `${5.2 + 7.8 * row.strength}px`,
                  background: '#c4782a',
                  opacity: 0.12 + 0.86 * row.strength,
                  boxShadow: `0 0 0 ${1 + 1.5 * row.strength}px rgba(196, 120, 42, ${0.22 + 0.78 * row.strength})`
                }}
              />
              {row.label}
            </p>
          ))}
          <p className="mt-1 text-[10px] leading-snug text-ink/45">
            Type colour stays. Size and fade show age — not the orange stale halo.
          </p>
        </>
      )}
      {showStale && (
        <>
          <p className={`font-semibold text-ink/70 ${showWards || hasReports ? 'mt-2' : ''}`}>Stale open</p>
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
          <p className={`font-semibold text-ink/70 ${showWards || showStale || hasReports ? 'mt-2' : ''}`}>Eco works</p>
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
      {showNotices && (
        <>
          <p className={`font-semibold text-ink/70 ${showWards || showStale || hasReports || showEco ? 'mt-2' : ''}`}>
            Council notices
          </p>
          <p className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#14b8a6]" />
            Town council page
          </p>
        </>
      )}
      {showEvents && (
        <>
          <p
            className={`font-semibold text-ink/70 ${showWards || showStale || hasReports || showEco || showNotices ? 'mt-2' : ''}`}
          >
            Events
          </p>
          <p className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Public what’s on
          </p>
        </>
      )}
    </>
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
  ecoWorks = [], showEco = false,
  notices = [], showNotices = false, selectedNoticeId = null,
  events = [], showEvents = false, selectedEventId = null
}: Props) {
  const mapped = [...reports.filter(isMapped)].sort((a, b) => {
    const da = reportAgeDays(a) ?? 9999;
    const db = reportAgeDays(b) ?? 9999;
    return db - da;
  });
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
    (showEco && ecoWorks.length > 0) ||
    (showNotices && notices.length > 0) ||
    (showEvents && events.length > 0);
  const keyProps: MapKeyProps = {
    showWards,
    showStale,
    showEco,
    showNotices,
    showEvents,
    hasReports: mapped.length > 0
  };
  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId);
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const panTarget =
    selectedEvent && selectedEvent.lat != null && selectedEvent.lng != null
      ? { lat: selectedEvent.lat, lng: selectedEvent.lng }
      : selectedNotice && selectedNotice.lat != null && selectedNotice.lng != null
        ? { lat: selectedNotice.lat, lng: selectedNotice.lng }
        : null;

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
            {showNotices ? ` · ${notices.length} notices` : ''}
            {showEvents ? ` · ${events.length} events` : ''}
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
          <CivicPanes />
          {wards && <FitWardsOnce wards={wards} />}
          {panTarget && <PanToNotice lat={panTarget.lat} lng={panTarget.lng} />}
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
            const pin = recencyPinStyle(ageDays, { selected, community, typeColor: TYPE_COLOR[type] });
            const tier = recencyTier(ageDays);
            const recencyStrong = (recencyStrength(ageDays) >= 0.74);
            return (
              <CircleMarker
                key={report.id}
                center={[report.lat, report.lng]}
                radius={pin.radius}
                pathOptions={{
                  color: pin.color,
                  weight: pin.weight,
                  opacity: pin.opacity,
                  fillColor: TYPE_COLOR[type],
                  fillOpacity: pin.fillOpacity
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
                  <p
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      recencyStrong ? 'bg-moss text-paper' : 'bg-stone text-ink/70'
                    }`}
                  >
                    {RECENCY_TIER_LABEL[tier]} · {formatRelative(report.ts)}
                  </p>
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

          {showNotices &&
            notices
              .filter((notice): notice is CouncilNotice & { lat: number; lng: number } => notice.lat != null && notice.lng != null)
              .map((notice) => {
                const selected = notice.id === selectedNoticeId;
                return (
                  <CivicPin
                    key={notice.id}
                    selected={selected}
                    center={[notice.lat, notice.lng]}
                    radius={selected ? 11 : 8}
                    pathOptions={{
                      color: selected ? '#115e59' : '#0f766e',
                      weight: selected ? 3 : 2,
                      fillColor: selected ? '#5eead4' : '#14b8a6',
                      fillOpacity: 0.92
                    }}
                  >
                    <Popup className="restore-popup">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0f766e]">Council notice</p>
                      <p className="mt-1 inline-block rounded-full bg-[#0f766e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                        Penistone Town Council
                      </p>
                      <p className="mt-1 font-semibold leading-snug">{notice.title}</p>
                      <p className="mt-1 text-sm text-ink/70">{notice.summary}</p>
                      {notice.area && <p className="mt-1 text-xs text-ink/50">{notice.area}</p>}
                      <p className="text-xs text-ink/50">{formatNoticeDate(notice.date)}</p>
                      <a
                        className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                        href={notice.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open official notice
                      </a>
                    </Popup>
                  </CivicPin>
                );
              })}

          {showEvents &&
            events
              .filter((event): event is CommunityEvent & { lat: number; lng: number } => event.lat != null && event.lng != null)
              .map((event) => {
                const selected = event.id === selectedEventId;
                const when =
                  event.end && event.end !== event.start
                    ? `${formatNoticeDate(event.start)} – ${formatNoticeDate(event.end)}`
                    : formatNoticeDate(event.start);
                return (
                  <CivicPin
                    key={event.id}
                    selected={selected}
                    center={[event.lat, event.lng]}
                    radius={selected ? 11 : 9}
                    pathOptions={{
                      color: selected ? '#9a3412' : '#b45309',
                      weight: selected ? 3 : 2,
                      fillColor: selected ? '#fdba74' : '#f59e0b',
                      fillOpacity: 0.92
                    }}
                  >
                    <Popup className="restore-popup">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b45309]">Event</p>
                      <p className="mt-1 inline-block rounded-full bg-[#b45309] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                        {event.source}
                      </p>
                      <p className="mt-1 font-semibold leading-snug">{event.title}</p>
                      <p className="mt-1 text-sm text-ink/70">{event.summary}</p>
                      <p className="mt-1 text-xs text-ink/50">{event.place}</p>
                      {event.area && <p className="text-xs text-ink/50">{event.area}</p>}
                      <p className="text-xs text-ink/50">{when}</p>
                      <a
                        className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open listing
                      </a>
                    </Popup>
                  </CivicPin>
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
        {hasMapKey(keyProps) && (
          <details className="map-key-panel absolute bottom-3 left-3 z-[400] hidden max-w-[200px] rounded-xl border border-line bg-paper/95 text-[11px] shadow-sm md:block">
            <summary className="cursor-pointer select-none px-3 py-2 font-semibold text-ink/80">Map key</summary>
            <div className="max-h-36 overflow-y-auto px-3 pb-2">
              <MapKeyBody {...keyProps} />
            </div>
          </details>
        )}
        {mapped.length === 0 && !overlayPins && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-stone/70 px-6 text-center">
            <p className="max-w-sm text-sm text-ink/70">
              The map is ready. Markers appear when FixMyStreet reports or approved community tips have coordinates.
            </p>
          </div>
        )}
      </div>
      {hasMapKey(keyProps) && (
        <details className="map-key-panel border-t border-line px-4 py-2 md:hidden">
          <summary className="cursor-pointer select-none text-sm font-semibold text-moss">Map key</summary>
          <div className="mt-2 text-[11px]">
            <MapKeyBody {...keyProps} />
          </div>
        </details>
      )}
    </section>
  );
}

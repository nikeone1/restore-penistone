import { useCallback, useEffect, useMemo, useState } from 'react';
import { CouncillorsPanel } from './components/CouncillorsPanel';
import { Header } from './components/Header';
import { IssueMap } from './components/IssueMap';
import { ModPanel } from './components/ModPanel';
import { NeedsPanel } from './components/NeedsPanel';
import { RecurringPanel } from './components/RecurringPanel';
import { StatsPanel } from './components/StatsPanel';
import { TipForm } from './components/TipForm';
import { WeatherWidget } from './components/WeatherWidget';
import { WeeklyBrief } from './components/WeeklyBrief';
import { loadApprovedTips, loadReports } from './lib/api';
import { TIMEFRAME_LABEL, TIMEFRAMES, filterByTimeframe, timeframeCounts, type Timeframe } from './lib/recency';
import { staleReports } from './lib/stale';
import type {
  AirStation,
  CollisionRecord,
  Councillor,
  CouncillorsPayload,
  EcoWork,
  EcoWorksPayload,
  FeedSource,
  FloodArea,
  FloodWarning,
  HmoPayload,
  HmoRecord,
  PlanningApp,
  Report,
  ReportType,
  TrafficCamera,
  WardCollection
} from './lib/types';

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [tips, setTips] = useState<Report[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedSource | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ReportType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [pickPoint, setPickPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [hmos, setHmos] = useState<HmoRecord[]>([]);
  const [showHmos, setShowHmos] = useState(true);
  const [planning, setPlanning] = useState<PlanningApp[]>([]);
  const [showPlanning, setShowPlanning] = useState(false);
  const [planningHmo, setPlanningHmo] = useState<PlanningApp[]>([]);
  const [showPlanningHmo, setShowPlanningHmo] = useState(false);
  const [floodAreas, setFloodAreas] = useState<FloodArea[]>([]);
  const [floodWarnings, setFloodWarnings] = useState<FloodWarning[]>([]);
  const [showFlood, setShowFlood] = useState(false);
  const [collisions, setCollisions] = useState<CollisionRecord[]>([]);
  const [showCollisions, setShowCollisions] = useState(false);
  const [trafficCams, setTrafficCams] = useState<TrafficCamera[]>([]);
  const [showTrafficCams, setShowTrafficCams] = useState(true);
  const [prow, setProw] = useState<GeoJSON.FeatureCollection | null>(null);
  const [showProw, setShowProw] = useState(false);
  const [airStations, setAirStations] = useState<AirStation[]>([]);
  const [showAir, setShowAir] = useState(false);
  const [wards, setWards] = useState<WardCollection | null>(null);
  const [showWards, setShowWards] = useState(true);
  const [showStale, setShowStale] = useState(true);
  const [councillors, setCouncillors] = useState<Councillor[]>([]);
  const [findMemberUrl, setFindMemberUrl] = useState('https://barnsleymbc.moderngov.co.uk/mgFindMember.aspx');
  const [showCouncillors, setShowCouncillors] = useState(true);
  const [ecoWorks, setEcoWorks] = useState<EcoWork[]>([]);
  const [showEco, setShowEco] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('all');

  const refreshTips = useCallback(() => {
    loadApprovedTips()
      .then(setTips)
      .catch(() => setTips([]));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadReports(ctrl.signal)
      .then(({ data, feed: nextFeed }) => {
        setReports(data.reports);
        setUpdated(data.updated);
        setFeed(nextFeed);
        setStatus(data.reports.length ? 'ready' : 'empty');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      });
    loadApprovedTips(ctrl.signal)
      .then(setTips)
      .catch(() => setTips([]));
    fetch('/data/hmo-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: HmoPayload) => setHmos(data.hmos || []))
      .catch(() => setHmos([]));
    fetch('/data/planning-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { applications?: PlanningApp[] }) => setPlanning(data.applications || []))
      .catch(() => setPlanning([]));
    fetch('/data/planning-hmo.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { applications?: PlanningApp[] }) => setPlanningHmo(data.applications || []))
      .catch(() => setPlanningHmo([]));
    fetch('/data/flood-areas-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { areas?: FloodArea[] }) => setFloodAreas(data.areas || []))
      .catch(() => setFloodAreas([]));
    fetch('/data/collisions-barnsley-2025.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { collisions?: CollisionRecord[] }) => setCollisions(data.collisions || []))
      .catch(() => setCollisions([]));
    fetch('/data/traffic-cameras-nearby.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { cameras?: TrafficCamera[] }) => setTrafficCams(data.cameras || []))
      .catch(() => setTrafficCams([]));
    fetch('/data/prow-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: GeoJSON.FeatureCollection) => setProw(data))
      .catch(() => setProw(null));
    fetch('/data/air-quality-nearby.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { stations?: AirStation[] }) => setAirStations(data.stations || []))
      .catch(() => setAirStations([]));
    fetch('/data/wards-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: WardCollection) => setWards(data))
      .catch(() => setWards(null));
    fetch('/data/councillors-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CouncillorsPayload) => {
        setCouncillors(data.councillors || []);
        if (data.findMemberUrl) setFindMemberUrl(data.findMemberUrl);
      })
      .catch(() => setCouncillors([]));
    fetch('/data/ecological-works-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: EcoWorksPayload) => setEcoWorks(data.works || []))
      .catch(() => setEcoWorks([]));
    fetch('https://environment.data.gov.uk/flood-monitoring/id/floods?lat=53.525&long=-1.628&dist=25', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items?: Array<Record<string, unknown>> }) => {
        const items = data.items || [];
        setFloodWarnings(
          items.map((item, idx) => {
            const fa = (item.floodArea as Record<string, unknown>) || {};
            const code = String(fa.fwdCode || fa.notation || '');
            return {
              id: String(item['@id'] || `fw-${idx}`),
              severity: String(item.severity || 'Flood alert'),
              severityLevel: Number(item.severityLevel || 0),
              description: String(item.description || ''),
              message: String(item.message || ''),
              lat: typeof fa.lat === 'number' ? fa.lat : fa.lat != null ? Number(fa.lat) : null,
              lng: typeof fa.long === 'number' ? fa.long : fa.long != null ? Number(fa.long) : null,
              areaName: String(fa.label || fa.county || ''),
              url: code ? `https://check-for-flooding.service.gov.uk/target-area/${code}` : String(item['@id'] || ''),
            } as FloodWarning;
          })
        );
      })
      .catch(() => setFloodWarnings([]));
    return () => ctrl.abort();
  }, []);

  const combined = useMemo(() => [...reports, ...tips], [reports, tips]);
  const timed = useMemo(() => filterByTimeframe(combined, timeframe), [combined, timeframe]);
  const visible = useMemo(
    () => (activeType === 'all' ? timed : timed.filter((r) => r.type === activeType)),
    [timed, activeType]
  );
  const stale = useMemo(() => staleReports(timed), [timed]);
  const selected = combined.find((r) => r.id === selectedId) ?? null;
  const timeCounts = useMemo(() => timeframeCounts(combined), [combined]);

  return (
    <div className="min-h-screen">
      <Header
        status={status}
        count={reports.length}
        community={tips.length}
        updated={updated}
        feed={feed}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 pb-16">
        {status === 'loading' && (
          <div className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-sm text-ink/60">
            Restore is up. Pulling live FixMyStreet reports for Penistone East and West…
          </div>
        )}
        {status === 'error' && (
          <div className="rounded-2xl border border-[#8b3a3a]/30 bg-[#8b3a3a]/8 px-4 py-4 text-sm">
            <p className="font-semibold text-[#8b3a3a]">Reports service is down</p>
            <p className="mt-1 text-ink/70">{error}. Community tips and weather can still load.</p>
          </div>
        )}
        {status === 'empty' && (
          <div className="rounded-2xl border border-line bg-paper px-4 py-4 text-sm text-ink/70">
            FixMyStreet returned no Penistone reports just now. Approved community tips still appear if any exist.
          </div>
        )}

        <IssueMap
          reports={visible}
          selectedId={selectedId}
          onSelect={(r) => setSelectedId(r.id)}
          pickMode={pickMode}
          pickPoint={pickPoint}
          onPick={(lat, lng) => setPickPoint({ lat, lng })}
          hmos={hmos}
          showHmos={showHmos}
          planning={planning}
          showPlanning={showPlanning}
          planningHmo={planningHmo}
          showPlanningHmo={showPlanningHmo}
          floodAreas={floodAreas}
          floodWarnings={floodWarnings}
          showFlood={showFlood}
          collisions={collisions}
          showCollisions={showCollisions}
          trafficCams={trafficCams}
          showTrafficCams={showTrafficCams}
          prow={prow}
          showProw={showProw}
          airStations={airStations}
          showAir={showAir}
          wards={wards}
          showWards={showWards}
          stale={stale}
          showStale={showStale}
          councillors={councillors}
          showCouncillors={showCouncillors}
          ecoWorks={ecoWorks}
          showEco={showEco}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <span className="font-semibold text-moss">Timeframe</span>
          {TIMEFRAMES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeframe(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                timeframe === key ? 'bg-moss text-paper' : 'bg-stone text-ink/70'
              }`}
            >
              {TIMEFRAME_LABEL[key]} {timeCounts[key]}
            </button>
          ))}
          <span className="text-xs text-ink/55">
            Newest first in lists. Map pins from the last 7 days are larger with a moss ring; older pins fade. Stale (orange) is still-open after 14 days — not the same as new.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <span className="font-semibold text-moss">Layers</span>
          <button
            type="button"
            onClick={() => setShowWards((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showWards ? 'bg-[#1d4ed8] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Wards
          </button>
          <button
            type="button"
            onClick={() => setShowStale((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showStale ? 'bg-[#c2410c] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Stale {stale.length}
          </button>
          <button
            type="button"
            onClick={() => setShowCouncillors((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showCouncillors ? 'bg-[#2f4a34] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Councillors {councillors.length}
          </button>
          <button
            type="button"
            onClick={() => setShowHmos((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showHmos ? 'bg-[#5b2c6f] text-paper' : 'bg-stone text-ink/70'}`}
          >
            HMO {hmos.length}
          </button>
          <button
            type="button"
            onClick={() => setShowPlanning((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showPlanning ? 'bg-[#1a5276] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Planning {planning.length}
          </button>
          <button
            type="button"
            onClick={() => setShowPlanningHmo((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showPlanningHmo ? 'bg-[#6c3483] text-paper' : 'bg-stone text-ink/70'}`}
          >
            HMO planning {planningHmo.length}
          </button>
          <button
            type="button"
            onClick={() => setShowFlood((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showFlood ? 'bg-[#2874a6] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Flood {floodWarnings.length}/{floodAreas.length}
          </button>
          <button type="button" onClick={() => setShowCollisions((v) => !v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${showCollisions ? 'bg-[#922b21] text-paper' : 'bg-stone text-ink/70'}`}>
            Collisions {collisions.length}
          </button>
          <button type="button" onClick={() => setShowTrafficCams((v) => !v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${showTrafficCams ? 'bg-[#ca6f1e] text-paper' : 'bg-stone text-ink/70'}`}>
            Traffic cams {trafficCams.length}
          </button>
          <button type="button" onClick={() => setShowProw((v) => !v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${showProw ? 'bg-[#196f3d] text-paper' : 'bg-stone text-ink/70'}`}>
            Paths
          </button>
          <button type="button" onClick={() => setShowAir((v) => !v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${showAir ? 'bg-[#0e6655] text-paper' : 'bg-stone text-ink/70'}`}>
            Air {airStations.length}
          </button>
          <button
            type="button"
            onClick={() => setShowEco((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showEco ? 'bg-[#15803d] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Eco works {ecoWorks.length}
          </button>
          <span className="text-xs text-ink/55">
            Traffic cams are National Highways motorway CCTV (not town-centre cameras). Stale = open reports older than 14 days. Eco works = public council / biodiversity plans · approximate locations · not live contractor GPS.
          </span>
        </div>

        <StatsPanel reports={timed} activeType={activeType} onType={setActiveType} />

        <CouncillorsPanel councillors={councillors} findMemberUrl={findMemberUrl} />

        <TipForm
          pickMode={pickMode}
          pickPoint={pickPoint}
          onTogglePick={(on) => {
            setPickMode(on);
            if (!on) setPickPoint(null);
          }}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <WeatherWidget />
          <NeedsPanel reports={timed} onSelect={(r) => setSelectedId(r.id)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RecurringPanel reports={timed} onSelect={(r) => setSelectedId(r.id)} />
          <WeeklyBrief reports={timed} selected={selected} onSelect={(r) => setSelectedId(r.id)} />
        </div>

        <ModPanel onChanged={refreshTips} />
      </main>

      <footer className="border-t border-line bg-paper/80 px-4 py-6 text-center text-xs text-ink/55">
        <p>
          <span className="font-display text-sm text-moss">Restore</span>
          {' · '}
          Penistone Insight Hub · FixMyStreet via Railway · community tips stored on this Worker ·
          weather from Open-Meteo · ward boundaries MapIt / OS / ONS · ecological works from published Barnsley TPT / biodiversity documents (approximate) · Facebook posts are pasted by a person from the Restore brief ·
          not affiliated with Barnsley Council
        </p>
      </footer>
    </div>
  );
}

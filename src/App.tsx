import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { FeedSource, FloodArea, FloodWarning, HmoPayload, HmoRecord, PlanningApp, Report, ReportType } from './lib/types';

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
  const [floodAreas, setFloodAreas] = useState<FloodArea[]>([]);
  const [floodWarnings, setFloodWarnings] = useState<FloodWarning[]>([]);
  const [showFlood, setShowFlood] = useState(false);

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
    fetch('/data/flood-areas-penistone.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { areas?: FloodArea[] }) => setFloodAreas(data.areas || []))
      .catch(() => setFloodAreas([]));
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
  const visible = useMemo(
    () => (activeType === 'all' ? combined : combined.filter((r) => r.type === activeType)),
    [combined, activeType]
  );
  const selected = combined.find((r) => r.id === selectedId) ?? null;

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
          floodAreas={floodAreas}
          floodWarnings={floodWarnings}
          showFlood={showFlood}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <span className="font-semibold text-moss">Layers</span>
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
            onClick={() => setShowFlood((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${showFlood ? 'bg-[#2874a6] text-paper' : 'bg-stone text-ink/70'}`}
          >
            Flood {floodWarnings.length}/{floodAreas.length}
          </button>
          <span className="text-xs text-ink/55">
            HMO · Planning (S36 snapshot) · Flood areas + live EA alerts
          </span>
        </div>

        <StatsPanel reports={combined} activeType={activeType} onType={setActiveType} />

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
          <NeedsPanel reports={combined} onSelect={(r) => setSelectedId(r.id)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RecurringPanel reports={combined} onSelect={(r) => setSelectedId(r.id)} />
          <WeeklyBrief reports={combined} selected={selected} />
        </div>

        <ModPanel onChanged={refreshTips} />
      </main>

      <footer className="border-t border-line bg-paper/80 px-4 py-6 text-center text-xs text-ink/55">
        <p>
          <span className="font-display text-sm text-moss">Restore</span>
          {' · '}
          Penistone Insight Hub · FixMyStreet via Railway · community tips stored on this Worker ·
          weather from Open-Meteo · Facebook posts are pasted by a person from the Restore brief ·
          not affiliated with Barnsley Council
        </p>
      </footer>
    </div>
  );
}

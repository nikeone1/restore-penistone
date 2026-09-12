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
import type { FeedSource, Report, ReportType } from './lib/types';

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
        />

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

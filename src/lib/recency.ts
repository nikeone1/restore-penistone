import { formatWhen } from './analytics';
import { ageInDays, reportTimestamp } from './stale';
import type { Report } from './types';

export const TIMEFRAMES = ['today', 'week', 'older', 'all'] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  today: 'Today',
  week: 'This week',
  older: 'Older',
  all: 'All'
};

/** Visual recency for map pins. Separate from stale (14+ days still open). */
export type RecencyTier = 'today' | 'week' | 'fading' | 'older' | 'unknown';

const HOUR_MS = 60 * 60 * 1000;

export function reportAgeDays(report: Report, now = Date.now()): number | null {
  const ts = reportTimestamp(report);
  if (ts == null) return null;
  return ageInDays(ts, now);
}

export function recencyTier(ageDays: number | null): RecencyTier {
  if (ageDays == null) return 'unknown';
  if (ageDays < 1) return 'today';
  if (ageDays < 7) return 'week';
  if (ageDays < 30) return 'fading';
  return 'older';
}

export function isHotReport(report: Report, now = Date.now()): boolean {
  const days = reportAgeDays(report, now);
  return days != null && days < 7;
}

export function inTimeframe(report: Report, timeframe: Timeframe, now = Date.now()): boolean {
  if (timeframe === 'all') return true;
  const days = reportAgeDays(report, now);
  if (days == null) return timeframe === 'older';
  if (timeframe === 'today') return days < 1;
  if (timeframe === 'week') return days < 7;
  return days >= 7;
}

export function filterByTimeframe(reports: Report[], timeframe: Timeframe, now = Date.now()): Report[] {
  return reports.filter((report) => inTimeframe(report, timeframe, now));
}

export function sortNewestFirst(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    const ta = reportTimestamp(a) ?? 0;
    const tb = reportTimestamp(b) ?? 0;
    return tb - ta;
  });
}

export function newestReports(reports: Report[], limit = 6): Report[] {
  return sortNewestFirst(reports).slice(0, limit);
}

export function timeframeCounts(reports: Report[], now = Date.now()): Record<Timeframe, number> {
  return {
    today: reports.filter((r) => inTimeframe(r, 'today', now)).length,
    week: reports.filter((r) => inTimeframe(r, 'week', now)).length,
    older: reports.filter((r) => inTimeframe(r, 'older', now)).length,
    all: reports.length
  };
}

/** Relative time for lists. Falls back to formatWhen for older / unparsed dates. */
export function formatRelative(ts: number, now = Date.now()): string {
  if (!ts) return formatWhen(ts);
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return formatWhen(ts);
  const delta = now - ts;
  if (delta < 0) return 'just now';
  if (delta < HOUR_MS) return 'just now';
  if (delta < 24 * HOUR_MS) {
    const hours = Math.floor(delta / HOUR_MS);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = ageInDays(ts, now);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 45) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return formatWhen(ts);
}

export function recencyPinStyle(
  ageDays: number | null,
  opts: { selected?: boolean; community?: boolean } = {}
): { radius: number; color: string; weight: number; fillOpacity: number } {
  const { selected = false, community = false } = opts;
  const tier = recencyTier(ageDays);
  const hot = tier === 'today' || tier === 'week';

  let radius = 8;
  if (selected) radius = 12;
  else if (tier === 'today') radius = 11;
  else if (tier === 'week') radius = 10;
  else if (tier === 'fading') radius = community ? 8 : 7;
  else radius = community ? 7 : 6;

  let color = community ? '#2f4a34' : '#fbf8f1';
  if (hot) color = '#2f4a34';
  else if (tier === 'older' || tier === 'unknown') color = community ? '#5c6b73' : '#d7d0c2';

  const weight = selected ? 3 : hot ? 3 : community ? 2.5 : 1.25;
  const fillOpacity = selected ? 1 : hot ? 0.95 : tier === 'fading' ? 0.7 : 0.45;

  return { radius, color, weight, fillOpacity };
}

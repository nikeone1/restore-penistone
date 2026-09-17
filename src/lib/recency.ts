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
export type RecencyTier = 'today' | 'week' | 'month' | 'older' | 'unknown';

export const RECENCY_TIER_LABEL: Record<RecencyTier, string> = {
  today: 'Today',
  week: 'This week',
  month: 'Last 30 days',
  older: 'Older',
  unknown: 'Date unknown'
};

/** Legend samples: strength 1 → 0.14 maps to size/opacity in recencyPinStyle. */
export const RECENCY_LEGEND: { tier: RecencyTier; label: string; strength: number }[] = [
  { tier: 'today', label: 'Today · strongest', strength: 1 },
  { tier: 'week', label: 'This week', strength: 0.8 },
  { tier: 'month', label: 'Last 30 days', strength: 0.46 },
  { tier: 'older', label: 'Older · faded', strength: 0.14 }
];

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
  if (ageDays < 30) return 'month';
  return 'older';
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16)
  };
}

function mixHex(from: string, toward: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(toward);
  if (!a || !b) return from;
  const m = Math.min(1, Math.max(0, t));
  const ch = (x: number, y: number) => Math.round(x + (y - x) * m);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(ch(a.r, b.r))}${h(ch(a.g, b.g))}${h(ch(a.b, b.b))}`;
}

/**
 * 1 = newest, ~0.14 = oldest. Stepped plateaus at <1 / <7 / <30 / older
 * with a short ramp inside each band so neighbouring days still differ.
 */
export function recencyStrength(ageDays: number | null): number {
  if (ageDays == null) return 0.14;
  const d = Math.max(0, ageDays);
  if (d < 1) return 1;
  if (d < 7) return lerp(0.88, 0.74, (d - 1) / 6);
  if (d < 30) return lerp(0.52, 0.38, (d - 7) / 23);
  if (d < 90) return lerp(0.22, 0.14, (d - 30) / 60);
  return 0.14;
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

export type RecencyPinStyle = {
  radius: number;
  color: string;
  weight: number;
  opacity: number;
  fillOpacity: number;
};

/**
 * Type fill colour is supplied by the caller. Size, stroke and opacity
 * scale with recency — not with the stale (still-open) heatmap.
 */
export function recencyPinStyle(
  ageDays: number | null,
  opts: { selected?: boolean; community?: boolean; typeColor?: string } = {}
): RecencyPinStyle {
  const { selected = false, community = false, typeColor = '#5c6b73' } = opts;
  const s = recencyStrength(ageDays);
  let radius = 5.2 + 7.8 * s;
  let weight = 1 + 3.2 * s;
  let fillOpacity = 0.12 + 0.86 * s;
  let opacity = 0.22 + 0.78 * s;

  if (community) {
    radius += 0.4;
    weight += 0.25;
  }
  if (selected) {
    radius += 2;
    weight += 1;
    fillOpacity = Math.min(1, fillOpacity + 0.08);
    opacity = Math.min(1, opacity + 0.08);
  }

  const bright = mixHex(typeColor, '#ffffff', 0.4 * s);
  const color = mixHex(bright, '#8a847a', 0.58 * (1 - s));

  return { radius, color, weight, opacity, fillOpacity };
}

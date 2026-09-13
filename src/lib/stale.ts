import type { Report, StaleReport, StaleTier } from './types';
import { isMapped } from './api';

export const STALE_DAYS = 14;
export const VERY_STALE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

function fromNumber(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const ms = value < 1e11 ? value * 1000 : value;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/** Parse a report date without inventing one. Accepts ms, seconds, or ISO-ish strings. */
export function parseReportTimestamp(value: unknown): number | null {
  if (typeof value === 'number') return fromNumber(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return fromNumber(Number(trimmed));
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function reportTimestamp(report: Report): number | null {
  const fromTs = parseReportTimestamp(report.ts);
  if (fromTs != null) return fromTs;
  return parseReportTimestamp(report.time);
}

export function ageInDays(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / DAY_MS));
}

export function staleTier(ageDays: number): StaleTier | null {
  if (ageDays >= VERY_STALE_DAYS) return 'very';
  if (ageDays >= STALE_DAYS) return 'stale';
  return null;
}

/** Open/unfixed items older than 14 days. Railway FMS feed is live opens; tips count if dated. */
export function staleReports(reports: Report[], now = Date.now()): StaleReport[] {
  const out: StaleReport[] = [];
  for (const report of reports) {
    if (!isMapped(report)) continue;
    const ts = reportTimestamp(report);
    if (ts == null) continue;
    const days = ageInDays(ts, now);
    const tier = staleTier(days);
    if (!tier) continue;
    out.push({ report, ageDays: days, tier, ts });
  }
  return out.sort((a, b) => b.ageDays - a.ageDays);
}

export function staleStyle(tier: StaleTier): { radius: number; color: string; fillColor: string; fillOpacity: number } {
  if (tier === 'very') {
    return { radius: 22, color: '#9a3412', fillColor: '#ea580c', fillOpacity: 0.32 };
  }
  return { radius: 16, color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.22 };
}

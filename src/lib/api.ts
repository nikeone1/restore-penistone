import { REPORT_TYPES, type CommunityTip, type FeedSource, type Report, type ReportType, type ReportsPayload } from './types';

export const RAILWAY_API = 'https://penistone-insight-backend-production.up.railway.app';
export const PENISTONE = { lat: 53.525, lng: -1.628 };
export const TIPS_API = 'https://restore-penistone.rust-quartz.workers.dev';

function isPayload(value: unknown): value is { updated: string | null; count: number; reports: Array<Omit<Report, 'origin'>> } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { count?: unknown; reports?: unknown };
  return typeof v.count === 'number' && Array.isArray(v.reports);
}

function asType(value: unknown): ReportType {
  return REPORT_TYPES.includes(value as ReportType) ? (value as ReportType) : 'other';
}

export function tipsBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('restore-penistone')) {
    return '';
  }
  if (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
    return import.meta.env.VITE_TIPS_API || 'http://127.0.0.1:43190';
  }
  return TIPS_API;
}

export async function loadReports(signal?: AbortSignal): Promise<{
  data: ReportsPayload;
  feed: FeedSource;
}> {
  const res = await fetch(`${RAILWAY_API}/api/reports`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const railway: unknown = await res.json();
  if (!isPayload(railway)) throw new Error('Unexpected reports response');
  const reports: Report[] = railway.reports.map((report) => ({
    ...report,
    type: asType(report.type),
    origin: 'fixmystreet'
  }));
  return { data: { updated: railway.updated, count: railway.count, reports }, feed: 'railway' };
}

export function tipToReport(tip: CommunityTip): Report {
  return {
    id: `tip:${tip.id}`,
    title: tip.title || tip.desc.slice(0, 80),
    loc: tip.loc || 'Penistone',
    area: tip.area || 'Penistone',
    lat: tip.lat,
    lng: tip.lng,
    type: asType(tip.type),
    severity: 'normal',
    ts: tip.created_at,
    time: 'Community',
    url: tip.url || '',
    media: tip.media || null,
    desc: tip.desc,
    source: 'Community tip',
    origin: 'community'
  };
}

export async function loadApprovedTips(signal?: AbortSignal): Promise<Report[]> {
  const res = await fetch(`${tipsBase()}/api/tips`, { signal });
  if (!res.ok) throw new Error(`Tips unavailable (${res.status})`);
  const data = (await res.json()) as { tips?: CommunityTip[] };
  return (data.tips || []).map(tipToReport);
}

export async function submitTip(body: {
  desc: string;
  loc?: string;
  area?: string;
  type?: string;
  url?: string;
  media?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch(`${tipsBase()}/api/tips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json() as Promise<{ ok: boolean; id?: string; error?: string }>;
}

export async function loadModQueue(secret: string): Promise<{
  pending: CommunityTip[];
  approved: CommunityTip[];
  rejected: CommunityTip[];
}> {
  const res = await fetch(`${tipsBase()}/api/tips/mod`, {
    headers: { 'X-Restore-Mod': secret }
  });
  if (res.status === 401) throw new Error('Wrong moderation code.');
  if (!res.ok) throw new Error(`Moderation list failed (${res.status})`);
  return res.json() as Promise<{ pending: CommunityTip[]; approved: CommunityTip[]; rejected: CommunityTip[] }>;
}

export async function moderateTip(secret: string, id: string, action: 'approve' | 'reject'): Promise<void> {
  const res = await fetch(`${tipsBase()}/api/tips/${id}/moderate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Restore-Mod': secret },
    body: JSON.stringify({ action })
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Could not ${action} tip`);
  }
}

export function isMapped(report: Report): report is Report & { lat: number; lng: number } {
  return typeof report.lat === 'number' && typeof report.lng === 'number';
}

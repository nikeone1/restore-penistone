import type { Report, ReportType } from './types';
import { REPORT_TYPES } from './types';

export const TYPE_LABEL: Record<ReportType, string> = {
  pothole: 'Potholes',
  litter: 'Litter',
  lighting: 'Lighting',
  asb: 'ASB',
  other: 'Other'
};

export const TYPE_COLOR: Record<ReportType, string> = {
  pothole: '#c4782a',
  litter: '#3f6b4a',
  lighting: '#c9a227',
  asb: '#8b3a3a',
  other: '#5c6b73'
};

const TYPE_WEIGHT: Record<ReportType, number> = {
  pothole: 4,
  asb: 4,
  lighting: 3,
  litter: 2,
  other: 1
};

export function normalizeStreet(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/,?\s*barnsley\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function streetLabel(loc: string): string {
  return loc.replace(/,?\s*Barnsley\b/i, '').replace(/\s+/g, ' ').trim() || loc;
}

export function countsByType(reports: Report[]): Record<ReportType, number> {
  const counts = { pothole: 0, litter: 0, lighting: 0, asb: 0, other: 0 };
  for (const report of reports) {
    const key = REPORT_TYPES.includes(report.type) ? report.type : 'other';
    counts[key] += 1;
  }
  return counts;
}

function wardLabel(report: Report): string {
  const area = (report.area || '').trim();
  const source = (report.source || '').trim();
  const generic = !area || area.toLowerCase() === 'penistone';
  const raw = generic && source ? source : area || source || 'Penistone';
  return raw.replace(/\s*\(keyword filtered\)/i, '').replace(/\s+ward$/i, '');
}

export function countsByWard(reports: Report[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const report of reports) {
    const label = wardLabel(report);
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function trendByDay(reports: Report[], days = 14): { day: string; count: number; label: string }[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const report of reports) {
    if (!report.ts) continue;
    const key = new Date(report.ts).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()].map(([day, count]) => ({
    day,
    count,
    label: new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }));
}

export type RecurringGroup = {
  key: string;
  loc: string;
  type: ReportType;
  count: number;
  reports: Report[];
};

export function recurringIssues(reports: Report[], min = 3): RecurringGroup[] {
  const groups = new Map<string, RecurringGroup>();
  for (const report of reports) {
    const type = REPORT_TYPES.includes(report.type) ? report.type : 'other';
    const street = normalizeStreet(report.loc);
    if (!street || street === 'penistone area') continue;
    const key = `${street}::${type}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.reports.push(report);
    } else {
      groups.set(key, {
        key,
        loc: streetLabel(report.loc),
        type,
        count: 1,
        reports: [report]
      });
    }
  }
  return [...groups.values()]
    .filter((g) => g.count >= min)
    .sort((a, b) => b.count - a.count || TYPE_WEIGHT[b.type] - TYPE_WEIGHT[a.type]);
}

export type NeedItem = {
  key: string;
  loc: string;
  type: ReportType;
  count: number;
  score: number;
  high: number;
  latest: Report;
};

export function prioritisedNeeds(reports: Report[]): NeedItem[] {
  const groups = new Map<string, NeedItem>();
  for (const report of reports) {
    const type = REPORT_TYPES.includes(report.type) ? report.type : 'other';
    const street = normalizeStreet(report.loc) || 'penistone area';
    const key = `${street}::${type}`;
    const existing = groups.get(key);
    const highBonus = report.severity === 'high' ? 1 : 0;
    if (existing) {
      existing.count += 1;
      existing.high += highBonus;
      if (report.ts > existing.latest.ts) existing.latest = report;
    } else {
      groups.set(key, {
        key,
        loc: streetLabel(report.loc),
        type,
        count: 1,
        score: 0,
        high: highBonus,
        latest: report
      });
    }
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      score: item.count * TYPE_WEIGHT[item.type] + item.high * 2
    }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 8);
}

export function formatWhen(ts: number): string {
  if (!ts) return 'Recently';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function weeklySummary(reports: Report[]): string {
  const byType = countsByType(reports);
  const parts = REPORT_TYPES
    .filter((t) => byType[t] > 0)
    .map((t) => `${byType[t]} ${TYPE_LABEL[t].toLowerCase()}`);
  const topStreet = prioritisedNeeds(reports)[0];
  const streetBit = topStreet
    ? ` Most pressing: ${TYPE_LABEL[topStreet.type].toLowerCase()} around ${topStreet.loc} (${topStreet.count} reports).`
    : '';
  return `Penistone Insight Hub update: ${reports.length} live FixMyStreet issue${reports.length === 1 ? '' : 's'} (${parts.join(', ') || 'no category breakdown'}).${streetBit} Neighbours can add photos and updates on FixMyStreet. #Penistone`;
}

export function issuePost(report: Report): string {
  const where = streetLabel(report.loc);
  const via = report.origin === 'community' ? 'a community tip' : 'FixMyStreet';
  const link = report.url ? ` ${report.url}` : '';
  return `Penistone: ${report.title} near ${where}. From ${via}${report.severity === 'high' ? ' — flagged as high severity' : ''}.${link} #Penistone`;
}

export function topNeedsThisWeek(reports: Report[]): NeedItem[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = reports.filter((r) => r.ts >= weekAgo);
  return prioritisedNeeds(week);
}

export function staleNeeds(reports: Report[]): NeedItem[] {
  const fortnight = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return prioritisedNeeds(reports).filter((item) => item.latest.ts > 0 && item.latest.ts < fortnight);
}

export function restoreBrief(reports: Report[]): string {
  const fms = reports.filter((r) => r.origin !== 'community');
  const tips = reports.filter((r) => r.origin === 'community').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = reports.filter((r) => r.ts >= weekAgo);
  const weekNeeds = topNeedsThisWeek(reports);
  const stale = staleNeeds(reports).slice(0, 3);
  const byType = countsByType(fms);
  const typeLine = REPORT_TYPES.filter((t) => byType[t] > 0).map((t) => `${byType[t]} ${TYPE_LABEL[t].toLowerCase()}`).join(', ');
  const dated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines = [
    `WEEKLY BRIEF — Penistone Insight Hub`,
    dated,
    '',
    `FixMyStreet (live Railway feed): ${fms.length} reports${typeLine ? ` — ${typeLine}` : ''}.`,
    `Community tips (approved only): ${tips.length}.`,
    `New this week: ${week.length} item${week.length === 1 ? '' : 's'}.`,
    ''
  ];

  if (weekNeeds.length) {
    lines.push('Top needs this week:');
    weekNeeds.slice(0, 5).forEach((item, i) => {
      const via = item.latest.origin === 'community' ? 'community tip' : 'FixMyStreet';
      lines.push(`${i + 1}. ${item.loc} — ${TYPE_LABEL[item.type].toLowerCase()} (${item.count}, latest via ${via})`);
    });
    lines.push('');
  } else {
    lines.push('Top needs this week: no new clustered reports in the last 7 days.');
    lines.push('');
  }

  if (stale.length) {
    lines.push('Stale signals (last update older than 14 days, still in the live window):');
    stale.forEach((item) => {
      lines.push(`- ${item.loc} (${TYPE_LABEL[item.type]}, latest ${formatWhen(item.latest.ts)})`);
    });
    lines.push('');
  }

  if (tips.length) {
    lines.push('Approved community tips:');
    tips.slice(0, 8).forEach((tip) => {
      lines.push(`- ${tip.title} — ${streetLabel(tip.loc)} (${formatWhen(tip.ts)})${tip.url ? ` (${tip.url})` : ''}`);
    });
    lines.push('');
  }

  lines.push('This hub does not post to Facebook. A person should paste this brief into local groups.');
  lines.push('#Penistone');
  return lines.join('\n');
}

import { TYPE_COLOR, TYPE_LABEL, countsByType, countsByWard, trendByDay } from '../lib/analytics';
import { REPORT_TYPES, type Report, type ReportType } from '../lib/types';

type Props = {
  reports: Report[];
  activeType: ReportType | 'all';
  onType: (type: ReportType | 'all') => void;
};

export function StatsPanel({ reports, activeType, onType }: Props) {
  const byType = countsByType(reports);
  const wards = countsByWard(reports);
  const trend = trendByDay(reports);
  const maxTrend = Math.max(1, ...trend.map((d) => d.count));

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">What is being reported</h2>
      <p className="mt-1 text-sm text-ink/60">Counts from the live FixMyStreet feed. Tap a category to filter the map.</p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <button
          type="button"
          onClick={() => onType('all')}
          className={`rounded-xl border px-3 py-2 text-left ${activeType === 'all' ? 'border-moss bg-moss text-paper' : 'border-line bg-stone/50'}`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">All</p>
          <p className="text-xl font-semibold">{reports.length}</p>
        </button>
        {REPORT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onType(type)}
            className={`rounded-xl border px-3 py-2 text-left ${activeType === type ? 'border-moss bg-white' : 'border-line bg-stone/50'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
              {TYPE_LABEL[type]}
            </p>
            <p className="text-xl font-semibold">{byType[type]}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-ink/80">By ward / source</h3>
          <ul className="mt-2 space-y-2">
            {wards.length === 0 && <li className="text-sm text-ink/55">No ward split yet.</li>}
            {wards.map((ward) => (
              <li key={ward.label} className="flex items-center justify-between gap-3 text-sm">
                <span>{ward.label}</span>
                <span className="font-semibold">{ward.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink/80">Last 14 days</h3>
          <div className="mt-3 flex h-24 items-end gap-1">
            {trend.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-fern/80"
                  style={{ height: `${Math.max(4, (day.count / maxTrend) * 100)}%` }}
                  title={`${day.label}: ${day.count}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink/45">
            <span>{trend[0]?.label}</span>
            <span>{trend[trend.length - 1]?.label}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

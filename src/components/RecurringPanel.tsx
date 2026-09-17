import { recurringIssues, TYPE_COLOR, TYPE_LABEL } from '../lib/analytics';
import { formatRelative, isHotReport, sortNewestFirst } from '../lib/recency';
import type { Report } from '../lib/types';

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
};

export function RecurringPanel({ reports, onSelect }: Props) {
  const groups = recurringIssues(reports, 3).map((group) => {
    const ordered = sortNewestFirst(group.reports);
    return { ...group, reports: ordered, latest: ordered[0] ?? group.reports[0] };
  });

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Recurring issues</h2>
      <p className="mt-1 text-sm text-ink/60">
        Same street and category reported three or more times in the current feed — a sign it keeps coming back.
        Each row shows when the latest report landed.
      </p>
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">
          No street has three or more reports of the same type right now. That can change as the RSS window rolls forward.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {groups.map((group) => {
            const latest = group.latest;
            const hot = isHotReport(latest);
            return (
              <li key={group.key}>
                <button
                  type="button"
                  onClick={() => onSelect(latest)}
                  className={`w-full rounded-xl border px-3 py-2 text-left hover:border-moss/40 ${
                    hot ? 'border-moss/35 bg-moss/5' : 'border-line bg-stone/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{group.loc}</p>
                  <p className="text-xs text-ink/60">
                    <span style={{ color: TYPE_COLOR[group.type] }}>{TYPE_LABEL[group.type]}</span>
                    {' · '}
                    {group.count} reports
                    {' · '}
                    {hot && (
                      <span className="mr-1 rounded-full bg-moss px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                        New
                      </span>
                    )}
                    latest {formatRelative(latest.ts)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

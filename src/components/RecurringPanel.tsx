import { TYPE_COLOR, TYPE_LABEL, recurringIssues } from '../lib/analytics';
import type { Report } from '../lib/types';

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
};

export function RecurringPanel({ reports, onSelect }: Props) {
  const groups = recurringIssues(reports, 3);

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Recurring issues</h2>
      <p className="mt-1 text-sm text-ink/60">
        Same street and category reported three or more times in the current feed — a sign it keeps coming back.
      </p>
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">
          No street has three or more reports of the same type right now. That can change as the RSS window rolls forward.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {groups.map((group) => (
            <li key={group.key}>
              <button
                type="button"
                onClick={() => onSelect(group.reports[0])}
                className="w-full rounded-xl border border-line bg-stone/40 px-3 py-2 text-left hover:border-moss/40"
              >
                <p className="text-sm font-semibold">{group.loc}</p>
                <p className="text-xs text-ink/60">
                  <span style={{ color: TYPE_COLOR[group.type] }}>{TYPE_LABEL[group.type]}</span>
                  {' · '}
                  {group.count} reports
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

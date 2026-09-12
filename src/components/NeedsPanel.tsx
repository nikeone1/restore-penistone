import { TYPE_COLOR, TYPE_LABEL, formatWhen, prioritisedNeeds } from '../lib/analytics';
import type { Report } from '../lib/types';

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
};

export function NeedsPanel({ reports, onSelect }: Props) {
  const needs = prioritisedNeeds(reports);

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Prioritised needs</h2>
      <p className="mt-1 text-sm text-ink/60">
        Ranked by how often the same street and category appear, weighted toward potholes, lighting and ASB.
      </p>
      {needs.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">Nothing to rank until reports arrive.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {needs.map((item, index) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.latest)}
                className="flex w-full items-start gap-3 rounded-xl border border-line bg-stone/40 px-3 py-2 text-left hover:border-moss/40"
              >
                <span className="mt-0.5 w-6 font-display text-lg text-moss">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.loc}</span>
                  <span className="block text-xs text-ink/60">
                    <span style={{ color: TYPE_COLOR[item.type] }}>{TYPE_LABEL[item.type]}</span>
                    {' · '}
                    {item.count} report{item.count === 1 ? '' : 's'}
                    {item.high > 0 ? ` · ${item.high} high severity` : ''}
                    {' · '}
                    latest {formatWhen(item.latest.ts)}
                    {' · '}
                    {item.latest.origin === 'community' ? 'Community' : 'FixMyStreet'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

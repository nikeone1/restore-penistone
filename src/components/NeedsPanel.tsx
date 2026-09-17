import { useState } from 'react';
import { TYPE_COLOR, TYPE_LABEL, formatWhen, prioritisedNeeds } from '../lib/analytics';
import { formatRelative, isHotReport } from '../lib/recency';
import type { Report } from '../lib/types';
import { NewestStrip } from './NewestStrip';

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
};

type Tab = 'priority' | 'newest';

export function NeedsPanel({ reports, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>('priority');
  const needs = prioritisedNeeds(reports);

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Prioritised needs</h2>
      <p className="mt-1 text-sm text-ink/60">
        Ranked by how often the same street and category appear, weighted toward potholes, lighting and ASB.
        Latest time is shown on each row — use Newest for a recency list.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('priority')}
          className={`rounded-full px-3 py-1 text-sm ${tab === 'priority' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Priority
        </button>
        <button
          type="button"
          onClick={() => setTab('newest')}
          className={`rounded-full px-3 py-1 text-sm ${tab === 'newest' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Newest
        </button>
      </div>

      {tab === 'newest' ? (
        <div className="mt-4">
          <NewestStrip reports={reports} onSelect={onSelect} limit={10} />
        </div>
      ) : needs.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">Nothing to rank until reports arrive.</p>
      ) : (
        <>
          <div className="mt-4">
            <NewestStrip reports={reports} onSelect={onSelect} limit={4} />
          </div>
          <ol className="mt-4 space-y-2">
            {needs.map((item, index) => {
              const hot = isHotReport(item.latest);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.latest)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left hover:border-moss/40 ${
                      hot ? 'border-moss/35 bg-moss/5' : 'border-line bg-stone/40'
                    }`}
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
                        {hot && (
                          <span className="mr-1 rounded-full bg-moss px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                            New
                          </span>
                        )}
                        latest {formatRelative(item.latest.ts)}
                        {item.latest.ts ? ` (${formatWhen(item.latest.ts)})` : ''}
                        {' · '}
                        {item.latest.origin === 'community' ? 'Community' : 'FixMyStreet'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}

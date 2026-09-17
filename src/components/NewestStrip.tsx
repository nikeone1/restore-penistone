import { TYPE_COLOR, TYPE_LABEL, streetLabel } from '../lib/analytics';
import { formatRelative, isHotReport, newestReports } from '../lib/recency';
import type { Report, ReportType } from '../lib/types';

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
  limit?: number;
};

export function NewestStrip({ reports, onSelect, limit = 6 }: Props) {
  const items = newestReports(reports, limit);

  return (
    <div className="rounded-xl border border-moss/25 bg-moss/5 p-3">
      <h3 className="text-sm font-semibold text-moss">Newest reports</h3>
      <p className="mt-0.5 text-xs text-ink/55">Sorted latest first. Moss highlight = last 7 days.</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No dated reports in this view.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((report) => {
            const type = (report.type in TYPE_COLOR ? report.type : 'other') as ReportType;
            const hot = isHotReport(report);
            return (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => onSelect(report)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left hover:border-moss/40 ${
                    hot ? 'border-moss/35 bg-paper' : 'border-line/80 bg-paper/70'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{report.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                      {hot && (
                        <span className="rounded-full bg-moss px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                          New
                        </span>
                      )}
                      <span className="font-semibold text-moss">{formatRelative(report.ts)}</span>
                      <span style={{ color: TYPE_COLOR[type] }}>{TYPE_LABEL[type]}</span>
                      <span>· {streetLabel(report.loc)}</span>
                      <span>· {report.origin === 'community' ? 'Community' : 'FixMyStreet'}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

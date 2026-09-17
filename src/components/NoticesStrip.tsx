import type { CouncilNotice } from '../lib/types';

type Props = {
  notices: CouncilNotice[];
  selectedId: string | null;
  onSelect: (notice: CouncilNotice) => void;
};

function formatNoticeDate(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NoticesStrip({ notices, selectedId, onSelect }: Props) {
  const items = [...notices].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-moss">Council notices</h2>
          <p className="text-xs text-ink/55">
            {items.length} public items from Penistone Town Council · pins on the map · tap a row to open the pin
          </p>
        </div>
        <a
          className="text-xs font-semibold text-moss underline decoration-line underline-offset-2"
          href="https://penistonetowncouncil.gov.uk/news-notices/"
          target="_blank"
          rel="noreferrer"
        >
          Source page
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No curated notices in this snapshot.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
          {items.map((notice) => {
            const selected = notice.id === selectedId;
            return (
              <li key={notice.id}>
                <button
                  type="button"
                  onClick={() => onSelect(notice)}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-left ${
                    selected ? 'border-moss/40 bg-moss/5' : 'border-transparent hover:border-line hover:bg-stone/60'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{notice.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink/55">
                      {formatNoticeDate(notice.date)}
                      {notice.area ? ` · ${notice.area}` : ''}
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

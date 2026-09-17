import type { CommunityEvent, CouncilNotice } from '../lib/types';

type CivicItem =
  | { kind: 'notice'; date: string; notice: CouncilNotice }
  | { kind: 'event'; date: string; event: CommunityEvent };

type Props = {
  notices: CouncilNotice[];
  events: CommunityEvent[];
  showNotices: boolean;
  showEvents: boolean;
  selectedNoticeId: string | null;
  selectedEventId: string | null;
  onSelectNotice: (notice: CouncilNotice) => void;
  onSelectEvent: (event: CommunityEvent) => void;
};

function formatDay(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function eventRange(event: CommunityEvent): string {
  if (!event.end || event.end === event.start) return formatDay(event.start);
  return `${formatDay(event.start)} – ${formatDay(event.end)}`;
}

export function WhatsOnStrip({
  notices,
  events,
  showNotices,
  showEvents,
  selectedNoticeId,
  selectedEventId,
  onSelectNotice,
  onSelectEvent
}: Props) {
  const items: CivicItem[] = [];
  if (showNotices) {
    for (const notice of notices) items.push({ kind: 'notice', date: notice.date, notice });
  }
  if (showEvents) {
    for (const event of events) items.push({ kind: 'event', date: event.start, event });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));

  const noticeCount = showNotices ? notices.length : 0;
  const eventCount = showEvents ? events.length : 0;
  const heading = showEvents && showNotices ? 'What’s on' : showEvents ? 'Events' : 'Council notices';
  const sourceHref = showEvents && !showNotices ? 'https://www.penistoneparamount.co.uk/whatson/live' : 'https://penistonetowncouncil.gov.uk/news-notices/';
  const sourceLabel = showEvents && !showNotices ? 'Paramount listings' : 'Council notices';

  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-moss">{heading}</h2>
          <p className="text-xs text-ink/55">
            {showEvents ? `${eventCount} event${eventCount === 1 ? '' : 's'}` : null}
            {showEvents && showNotices ? ' · ' : null}
            {showNotices ? `${noticeCount} notice${noticeCount === 1 ? '' : 's'}` : null}
            {' · '}
            public pages only · tap a row to open the pin
          </p>
        </div>
        <a
          className="text-xs font-semibold text-moss underline decoration-line underline-offset-2"
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
        >
          {sourceLabel}
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No curated items in this snapshot.</p>
      ) : (
        <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            if (item.kind === 'notice') {
              const selected = item.notice.id === selectedNoticeId;
              return (
                <li key={`notice:${item.notice.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelectNotice(item.notice)}
                    className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left ${
                      selected ? 'border-moss/40 bg-moss/5' : 'border-transparent hover:border-line hover:bg-stone/60'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded-full bg-[#0f766e] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                      Notice
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.notice.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink/55">
                        {formatDay(item.notice.date)}
                        {item.notice.area ? ` · ${item.notice.area}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            }
            const selected = item.event.id === selectedEventId;
            return (
              <li key={`event:${item.event.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(item.event)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left ${
                    selected ? 'border-clay/40 bg-clay/5' : 'border-transparent hover:border-line hover:bg-stone/60'
                  }`}
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-[#b45309] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Event
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.event.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink/55">
                      {eventRange(item.event)}
                      {item.event.place ? ` · ${item.event.place}` : ''}
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

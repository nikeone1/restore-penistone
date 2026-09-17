import type { CommunityEvent } from '../lib/types';

type Props = {
  events: CommunityEvent[];
  selectedEventId: string | null;
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

export function WhatsOnStrip({ events, selectedEventId, onSelectEvent }: Props) {
  const items = [...events].sort((a, b) => b.start.localeCompare(a.start));
  const eventCount = events.length;

  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-moss">What’s on</h2>
          <p className="text-xs text-ink/55">
            {eventCount} event{eventCount === 1 ? '' : 's'} · public pages only · tap a row to open the pin
          </p>
        </div>
        <a
          className="text-xs font-semibold text-moss underline decoration-line underline-offset-2"
          href="https://www.penistoneparamount.co.uk/whatson/live"
          target="_blank"
          rel="noreferrer"
        >
          Paramount listings
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No curated events in this snapshot.</p>
      ) : (
        <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
          {items.map((event) => {
            const selected = event.id === selectedEventId;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left ${
                    selected ? 'border-clay/40 bg-clay/5' : 'border-transparent hover:border-line hover:bg-stone/60'
                  }`}
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-[#b45309] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Event
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{event.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink/55">
                      {eventRange(event)}
                      {event.place ? ` · ${event.place}` : ''}
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

import type { FeedSource } from '../lib/types';

type Props = {
  status: 'loading' | 'ready' | 'empty' | 'error';
  count: number;
  community: number;
  updated: string | null;
  feed: FeedSource | null;
};

export function Header({ status, count, community, updated, feed }: Props) {
  const when = updated
    ? new Date(updated).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-paper" aria-hidden>
            <span className="font-display text-lg font-semibold">R</span>
          </div>
          <div>
            <p className="font-display text-2xl leading-none text-moss">Restore</p>
            <p className="text-sm text-ink/70">Penistone Insight Hub · East &amp; West wards</p>
          </div>
        </div>
        <div className="text-sm text-ink/75 sm:text-right">
          {status === 'loading' && <p>Loading FixMyStreet reports…</p>}
          {status === 'ready' && (
            <>
              <p className="font-medium text-moss">
                {count} FixMyStreet
                {community ? ` · ${community} community` : ''}
                {feed === 'railway' ? ' · Railway' : ''}
              </p>
              {when && <p className="text-ink/55">Updated {when}</p>}
            </>
          )}
          {status === 'empty' && <p>No reports in the current feed.</p>}
          {status === 'error' && <p className="text-[#8b3a3a]">Could not reach the reports service.</p>}
        </div>
      </div>
    </header>
  );
}

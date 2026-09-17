import { useMemo, useState } from 'react';
import { issuePost, restoreBrief, staleNeeds, streetLabel, topNeedsThisWeek } from '../lib/analytics';
import { formatRelative, isHotReport } from '../lib/recency';
import type { Report } from '../lib/types';
import { NewestStrip } from './NewestStrip';

type Props = {
  reports: Report[];
  selected: Report | null;
  onSelect?: (report: Report) => void;
};

export function WeeklyBrief({ reports, selected, onSelect }: Props) {
  const [mode, setMode] = useState<'brief' | 'issue'>('brief');
  const [copied, setCopied] = useState(false);
  const week = topNeedsThisWeek(reports);
  const stale = staleNeeds(reports);

  const text = useMemo(() => {
    if (mode === 'issue') {
      if (!selected) return 'Select a FixMyStreet report or an approved community tip to draft a single post.';
      return issuePost(selected);
    }
    return restoreBrief(reports);
  }, [mode, reports, selected]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `restore-brief-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-moss">Restore brief</h2>
          <p className="mt-1 text-sm text-ink/60">
            Weekly intel for a person to paste into Facebook groups. Restore never posts to Facebook itself.
          </p>
        </div>
        <span className="rounded-full bg-moss px-3 py-1 text-xs font-semibold tracking-wide text-paper">RESTORE</span>
      </div>

      {onSelect && (
        <div className="mt-4">
          <NewestStrip reports={reports} onSelect={onSelect} limit={5} />
        </div>
      )}

      <div className="mt-4 rounded-xl bg-stone/50 p-3">
        <h3 className="text-sm font-semibold text-ink/80">Top needs this week</h3>
        {week.length === 0 ? (
          <p className="mt-2 text-sm text-ink/55">No clustered reports in the last 7 days. The live FixMyStreet window may be older than a week.</p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {week.slice(0, 5).map((item, i) => {
              const hot = isHotReport(item.latest);
              return (
                <li key={item.key}>
                  {i + 1}. {item.loc} · {item.count} · {item.latest.origin === 'community' ? 'Community' : 'FixMyStreet'}
                  {' · '}
                  {hot ? 'New · ' : ''}
                  latest {formatRelative(item.latest.ts)}
                </li>
              );
            })}
          </ol>
        )}
        {stale.length > 0 && (
          <p className="mt-3 text-xs text-ink/55">
            Stale signal: {stale.slice(0, 2).map((s) => streetLabel(s.loc)).join(', ')} last updated more than 14 days ago.
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('brief')}
          className={`rounded-full px-3 py-1 text-sm ${mode === 'brief' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Weekly brief
        </button>
        <button
          type="button"
          onClick={() => setMode('issue')}
          className={`rounded-full px-3 py-1 text-sm ${mode === 'issue' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Selected item
        </button>
      </div>

      <textarea readOnly value={text} rows={8} className="mt-3 w-full resize-none rounded-xl border border-line bg-stone/40 p-3 text-sm leading-relaxed" />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-paper">
          {copied ? 'Copied' : 'Copy brief'}
        </button>
        <button type="button" onClick={download} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
          Download .txt
        </button>
      </div>
    </section>
  );
}

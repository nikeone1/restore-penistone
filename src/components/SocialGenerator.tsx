import { useMemo, useState } from 'react';
import { issuePost, streetLabel, weeklySummary } from '../lib/analytics';
import type { Report } from '../lib/types';

type Props = {
  reports: Report[];
  selected: Report | null;
};

export function SocialGenerator({ reports, selected }: Props) {
  const [mode, setMode] = useState<'issue' | 'week'>('issue');
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    if (mode === 'week') return weeklySummary(reports);
    if (selected) return issuePost(selected);
    return 'Select a report on the map or in the lists to draft a post, or switch to the weekly summary.';
  }, [mode, reports, selected]);

  const canCopy = mode === 'week' ? reports.length > 0 : Boolean(selected);

  async function copy() {
    if (!canCopy) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-moss">Share from Restore</h2>
          <p className="mt-1 text-sm text-ink/60">Ready-to-post text for residents&apos; groups and local pages. Always badged Restore.</p>
        </div>
        <span className="rounded-full bg-moss px-3 py-1 text-xs font-semibold tracking-wide text-paper">RESTORE</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('issue')}
          className={`rounded-full px-3 py-1 text-sm ${mode === 'issue' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Selected issue
        </button>
        <button
          type="button"
          onClick={() => setMode('week')}
          className={`rounded-full px-3 py-1 text-sm ${mode === 'week' ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
        >
          Weekly summary
        </button>
      </div>

      {mode === 'issue' && selected && (
        <p className="mt-3 text-xs text-ink/55">Using {selected.title} · {streetLabel(selected.loc)}</p>
      )}

      <textarea
        readOnly
        value={text}
        rows={5}
        className="mt-3 w-full resize-none rounded-xl border border-line bg-stone/40 p-3 text-sm leading-relaxed"
      />

      <button
        type="button"
        onClick={copy}
        disabled={!canCopy}
        className="mt-3 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? 'Copied' : 'Copy post'}
      </button>
    </section>
  );
}

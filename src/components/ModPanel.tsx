import { useState } from 'react';
import { loadModQueue, moderateTip } from '../lib/api';
import type { CommunityTip } from '../lib/types';
import { formatWhen } from '../lib/analytics';

type Props = {
  onChanged: () => void;
};

export function ModPanel({ onChanged }: Props) {
  const [secret, setSecret] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<CommunityTip[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError('');
    try {
      const queue = await loadModQueue(secret);
      setPending(queue.pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the queue.');
      setPending([]);
    }
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    setError('');
    try {
      await moderateTip(secret, id, action);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-line bg-paper/70 p-4">
      <button type="button" onClick={() => setOpen(!open)} className="text-sm font-semibold text-moss">
        {open ? 'Hide moderator' : 'Moderator (shared code)'}
      </button>
      {open && (
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-ink/60">
            Enter the shared moderation code. It is sent only to the approve endpoint — it is not stored in the public app bundle.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Shared code"
              className="flex-1 rounded-xl border border-line bg-stone/40 px-3 py-2 text-sm"
            />
            <button type="button" onClick={load} className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper">
              Load pending
            </button>
          </div>
          {error && <p className="text-sm text-[#8b3a3a]">{error}</p>}
          {pending.length === 0 && !error && (
            <p className="text-sm text-ink/55">No pending tips, or the queue has not been loaded yet.</p>
          )}
          <ul className="space-y-2">
            {pending.map((tip) => (
              <li key={tip.id} className="rounded-xl border border-line bg-stone/40 p-3 text-sm">
                <p className="font-semibold">{tip.title}</p>
                <p className="text-ink/70">{tip.desc}</p>
                <p className="mt-1 text-xs text-ink/55">
                  {tip.loc} · {tip.type} · {formatWhen(tip.created_at)}
                  {tip.url ? ` · ${tip.url}` : ''}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy === tip.id}
                    onClick={() => act(tip.id, 'approve')}
                    className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-paper"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === tip.id}
                    onClick={() => act(tip.id, 'reject')}
                    className="rounded-full bg-[#8b3a3a] px-3 py-1 text-xs font-semibold text-paper"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

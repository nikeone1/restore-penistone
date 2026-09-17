import { useState, type FormEvent } from 'react';
import { submitTip } from '../lib/api';
import { REPORT_TYPES } from '../lib/types';
import { TYPE_LABEL } from '../lib/analytics';

type Props = {
  pickMode: boolean;
  pickPoint: { lat: number; lng: number } | null;
  onTogglePick: (on: boolean) => void;
};

export function TipForm({ pickMode, pickPoint, onTogglePick }: Props) {
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [url, setUrl] = useState('');
  const [media, setMedia] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');
    const result = await submitTip({
      desc,
      loc,
      area,
      type: type || undefined,
      url,
      media,
      lat: pickPoint?.lat ?? null,
      lng: pickPoint?.lng ?? null
    });
    if (result.ok) {
      setStatus('ok');
      setMessage('Thanks. Your tip is pending — it appears on the map only after a moderator approves it.');
      setDesc('');
      setLoc('');
      setArea('');
      setUrl('');
      setMedia('');
      onTogglePick(false);
    } else {
      setStatus('err');
      setMessage(result.error || 'Could not send the tip.');
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Send a community tip</h2>
      <p className="mt-1 text-sm text-ink/60">
        Neighbours can flag something this hub should watch. We store a link if you add one — we never fetch or scrape Facebook.
        Tips stay off the map until a moderator approves them.
      </p>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">What did you notice?</span>
          <textarea
            required
            minLength={8}
            maxLength={500}
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="rounded-xl border border-line bg-stone/40 p-3"
            placeholder="Overflowing bin on the corner of Market Street…"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Street or landmark (optional)</span>
            <input value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-xl border border-line bg-stone/40 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Area (optional)</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Penistone East / West / village" className="rounded-xl border border-line bg-stone/40 px-3 py-2" />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Category (optional)</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-line bg-stone/40 px-3 py-2">
            <option value="">Unsure</option>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">FixMyStreet or Facebook link (optional, stored only)</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.fixmystreet.com/report/… or a public Facebook post URL"
            className="rounded-xl border border-line bg-stone/40 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Photo URL (optional — no file upload)</span>
          <input type="url" value={media} onChange={(e) => setMedia(e.target.value)} className="rounded-xl border border-line bg-stone/40 px-3 py-2" />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => onTogglePick(!pickMode)}
            className={`rounded-full px-3 py-1 ${pickMode ? 'bg-moss text-paper' : 'bg-stone text-ink/70'}`}
          >
            {pickMode ? 'Picking on map' : 'Drop a pin on the map'}
          </button>
          <span className="text-ink/55">
            {pickPoint
              ? `Pin ${pickPoint.lat.toFixed(4)}, ${pickPoint.lng.toFixed(4)}`
              : 'If you skip this, the map uses the town centre as an approximate pin.'}
          </span>
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Submit tip'}
        </button>
        {message && (
          <p className={`text-sm ${status === 'err' ? 'text-[#8b3a3a]' : 'text-moss'}`}>{message}</p>
        )}
      </form>
    </section>
  );
}

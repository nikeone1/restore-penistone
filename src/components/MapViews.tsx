import { LAYER_KEYS, LAYER_META, MAP_VIEWS, type LayerKey, type LayerFlags, type MapViewSelection } from '../lib/layers';

type Props = {
  view: MapViewSelection;
  onView: (id: Exclude<MapViewSelection, 'custom'>) => void;
  layers: LayerFlags;
  onToggleLayer: (key: LayerKey) => void;
  counts: Partial<Record<LayerKey, string>>;
};

export function MapViews({ view, onView, layers, onToggleLayer, counts }: Props) {
  const activeHint = MAP_VIEWS.find((item) => item.id === view)?.hint;

  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-moss">Layers</span>
        {LAYER_KEYS.map((key) => {
          const on = layers[key];
          const count = counts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleLayer(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                on ? LAYER_META[key].activeClass : 'bg-stone text-ink/70'
              }`}
            >
              {LAYER_META[key].label}
              {count ? ` ${count}` : ''}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink/55">
        FixMyStreet reports, community tips and recency stay on the map. Traffic cams are National Highways motorway CCTV (not town-centre cameras). Stale = open reports older than 14 days.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="text-xs font-semibold text-ink/60">Shortcuts</span>
        {MAP_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onView(item.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              view === item.id ? 'bg-moss text-paper' : 'bg-stone text-ink/70'
            }`}
          >
            {item.label}
          </button>
        ))}
        {view === 'custom' && (
          <span className="rounded-full bg-clay/15 px-3 py-1 text-xs font-semibold text-clay">Custom</span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink/55">
        Optional view presets. Individual layer pills stay visible.{activeHint ? ` ${activeHint}.` : ''}
      </p>
    </div>
  );
}

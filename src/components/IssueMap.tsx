import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { PENISTONE, isMapped } from '../lib/api';
import { TYPE_COLOR, TYPE_LABEL, formatWhen, streetLabel } from '../lib/analytics';
import type { HmoRecord, Report, ReportType } from '../lib/types';

type Props = {
  reports: Report[];
  selectedId: string | null;
  onSelect: (report: Report) => void;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickPoint?: { lat: number; lng: number } | null;
  hmos?: HmoRecord[];
  showHmos?: boolean;
};

function ClickCatcher({ enabled, onPick }: { enabled: boolean; onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      if (enabled && onPick) onPick(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

function provenance(report: Report): { label: string; href?: string } {
  if (report.origin === 'community') return { label: 'Community tip', href: report.url || undefined };
  return { label: 'FixMyStreet', href: report.url || undefined };
}

export function IssueMap({ reports, selectedId, onSelect, pickMode = false, onPick, pickPoint, hmos = [], showHmos = false }: Props) {
  const mapped = reports.filter(isMapped);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <div className="flex items-end justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-moss">Street map</h2>
          <p className="text-sm text-ink/60">
            {mapped.length} issue pin{mapped.length === 1 ? '' : 's'}
            {showHmos ? ` · ${hmos.length} HMO` : ''}
            {' '}· FixMyStreet, tips, and HMOs labelled separately
          </p>
        </div>
        {pickMode && (
          <p className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-paper">Tap the map to place your tip</p>
        )}
      </div>
      <div className="relative h-[58vh] min-h-[320px] w-full sm:h-[520px]">
        <MapContainer
          center={[PENISTONE.lat, PENISTONE.lng]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher enabled={pickMode} onPick={onPick} />
          {mapped.map((report) => {
            const type = (report.type in TYPE_COLOR ? report.type : 'other') as ReportType;
            const selected = report.id === selectedId;
            const community = report.origin === 'community';
            const source = provenance(report);
            return (
              <CircleMarker
                key={report.id}
                center={[report.lat, report.lng]}
                radius={selected ? 12 : community ? 9 : 8}
                pathOptions={{
                  color: community ? '#2f4a34' : '#fbf8f1',
                  weight: community ? 3 : selected ? 3 : 1.5,
                  fillColor: TYPE_COLOR[type],
                  fillOpacity: selected ? 1 : 0.88,
                  dashArray: community ? '1 0' : undefined
                }}
                eventHandlers={{ click: () => onSelect(report) }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
                    {TYPE_LABEL[type]}
                  </p>
                  <p className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper" style={{ background: community ? '#2f4a34' : '#5c6b73' }}>
                    {source.label}
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{report.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{streetLabel(report.loc)}</p>
                  <p className="text-xs text-ink/50">{formatWhen(report.ts)} · {report.area}</p>
                  {report.desc && community && <p className="mt-2 text-sm">{report.desc}</p>}
                  {report.media && <img src={report.media} alt="" />}
                  {source.href && (
                    <a
                      className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {community ? 'Open submitted link' : 'Open on FixMyStreet'}
                    </a>
                  )}
                </Popup>
              </CircleMarker>
            );
          })}

          {showHmos &&
            hmos.map((hmo) => (
              <CircleMarker
                key={hmo.id}
                center={[hmo.lat, hmo.lng]}
                radius={10}
                pathOptions={{
                  color: '#5b2c6f',
                  weight: 2.5,
                  fillColor: '#8e44ad',
                  fillOpacity: 0.85
                }}
              >
                <Popup className="restore-popup">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5b2c6f]">Licensed HMO</p>
                  <p className="mt-1 inline-block rounded-full bg-[#5b2c6f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    Barnsley register
                  </p>
                  <p className="mt-1 font-semibold leading-snug">
                    {hmo.houseNumber}, {hmo.address}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">{hmo.postcode}</p>
                  <p className="text-xs text-ink/50">
                    Permitted {hmo.permitted} · Expires {hmo.expires}
                  </p>
                  <a
                    className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                    href="https://www.barnsley.gov.uk/services/housing/private-landlords/houses-in-multiple-occupation-hmo/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Council HMO page
                  </a>
                  <br />
                  <a
                    className="inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                    href="https://www.barnsley.gov.uk/media/zebimlz3/hmo-register.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public register PDF
                  </a>
                </Popup>
              </CircleMarker>
            ))}

          {pickPoint && (
            <CircleMarker
              center={[pickPoint.lat, pickPoint.lng]}
              radius={10}
              pathOptions={{ color: '#2f4a34', weight: 3, fillColor: '#c4782a', fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
        {mapped.length === 0 && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-stone/70 px-6 text-center">
            <p className="max-w-sm text-sm text-ink/70">
              The map is ready. Markers appear when FixMyStreet reports or approved community tips have coordinates.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

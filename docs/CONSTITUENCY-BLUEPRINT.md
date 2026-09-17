# Restore constituency blueprint

Copy this when standing up another UK Restore hub. Penistone is the reference implementation (`nikeone1/restore-penistone`). Keep the product **simple**: live street reports on a map, always-visible layer pills, optional view shortcuts, curated public overlays.

## What this product is

A civic insight hub for one parliamentary / local geography (here: Penistone East and West wards, Barnsley).

- Live [FixMyStreet](https://www.fixmystreet.com/) reports (RSS, not HTML scrape)
- Approved community tips (Cloudflare Worker + Durable Object)
- Static curated JSON for everything that is not a live feed
- Legal public sources only
- Individual layer pills always on the chrome; optional view shortcuts
- Events / what’s on and council notices as **two separate lists**, not one mixed feed
- A person pastes the weekly brief into Facebook/X. The app never logs in or scrapes Meta/X.

## Data classes

| Class | Live or curated | Penistone files / URLs | Swap this |
| --- | --- | --- | --- |
| FMS reports | Live RSS | `backend/server.js` `SOURCES` + Railway `GET /api/reports` | Ward RSS URLs + village keywords |
| Community tips | Live Worker | `worker/api.js` Durable Object `TipStore` | Keep code; new Worker name/secret |
| Wards | Snapshot GeoJSON | `public/data/wards-penistone.json` | MapIt area IDs → simplify polygons |
| Councillors | Snapshot JSON | `public/data/councillors-penistone.json` | ModernGov / council directory |
| Planning | Snapshot JSON | `planning-penistone.json`, `planning-hmo.json` | Planning Explorer public search |
| Licensed HMO | Snapshot JSON | `hmo-penistone.json` | Council HMO register PDF |
| Flood | Snapshot areas + live EA | `flood-areas-penistone.json` + EA API `lat/long/dist` | Centre + radius |
| Highways cams | Snapshot JSON | `traffic-cameras-nearby.json` | National Highways / motorwaycameras near the box |
| Collisions | Annual snapshot | `collisions-barnsley-2025.json` | DfT STATS19 filter to LA |
| PROW | Snapshot GeoJSON | `prow-penistone.json` | rowmaps / council Definitive Map extract |
| Air quality | Snapshot JSON | `air-quality-nearby.json` | Nearest UK-AIR stations |
| Eco works | Curated JSON | `ecological-works-penistone.json` | Published council / biodiversity PDFs |
| Council notices | Curated JSON | `council-notices-penistone.json` | Town/parish **public** notices page |
| Events / what’s on | Curated JSON | `events-penistone.json` | Paramount/venue, council events, borough What’s On filtered to the town, markets, public recurring dates |
| Recency / stale | Derived | `src/lib/recency.ts`, `stale.ts` | Keep as-is (14 / 45 day rules) |

Map centre for Penistone: **53.525, -1.628** (`src/lib/api.ts` `PENISTONE` and the EA flood query).

## Forbidden (do not add)

- Meta / Facebook / Instagram / X scrapers, login bots, or unofficial Graph API harvests
- Private or town-centre CCTV (Barnsley does not publish street-camera open data)
- police.uk crime pins (locations are fuzzed; not useful on a street map)
- Elector / marked-register data
- Licence-holder personal details from HMO PDFs
- Fragile scrapers where a curated JSON snapshot will do (notices, events, eco works)

Facebook URLs on community tips are stored as links only — never fetched.

## How to swap geography

1. **Name the place.** Replace “Penistone East / West” in `Header`, README, footer, and JSON `area` strings.
2. **Map centre.** `src/lib/api.ts` `PENISTONE` and the flood-monitoring `lat` / `long` / `dist` in `App.tsx`.
3. **FixMyStreet RSS.** In `backend/server.js` (and the live Railway service) set ward feeds:

```js
const SOURCES = [
  { name: 'WARD A', url: 'https://www.fixmystreet.com/rss/reports/COUNCIL/Ward+Name', wardMatch: true, area: 'WARD A' },
  { name: 'WARD B', url: 'https://www.fixmystreet.com/rss/reports/COUNCIL/Other+Ward', wardMatch: true, area: 'WARD B' },
  { name: 'Borough keyword filter', url: 'https://www.fixmystreet.com/rss/reports/COUNCIL', wardMatch: false, area: 'Town' }
];
const VILLAGE_KEYWORDS = ['town', 'village-a', 'village-b'];
```

Use a plain User-Agent (`Restore/1.0 …`). Do **not** append `?type=MTW` (FixMyStreet 503). Chrome-like UAs often get 418.

4. **Wards.** Look up MapIt IDs at https://mapit.mysociety.org/ (GSS codes on the ward page). Download `/area/{id}.geojson`, simplify, write `public/data/wards-*.json` with `slug`, `gss`, `mapitId`, `centroid`. Update `src/lib/wards.ts` if you have more than east/west.
5. **Councillors.** Public ModernGov “Find a member” / council directory. Mailto/tel and profile URL only.
6. **Notices & events.** Copy currently listed **public** items into JSON. Fields:

Notices: `id`, `title`, `date`, `summary`, `sourceUrl`, optional `lat`/`lng`, `area`  
Events: `id`, `title`, `start`, optional `end`, `place`, `area`, optional `lat`/`lng`, `summary`, `source`, `sourceUrl`

Geocode public streets/venues with Nominatim. Skip TBC and social-only posts.

7. **Layers + shortcuts.** `src/lib/layers.ts` — keep **individual layer pills always visible**. Optional view presets (Overview, Events, Streets, Housing, Travel, Green) are shortcuts only; they must not hide the pills. Default Overview matches the original on/off mix plus notices and events. FixMyStreet + tips + recency stay on in every view. Put **What’s on** (events) and **Town Council Notices** as two distinct lists at the bottom of the page — never mix Event and Notice rows in one feed.

## Deploy path

**Frontend + tips API:** Cloudflare Worker (Wrangler). Static Vite build is served as Worker assets; `/api/tips*` hits `worker/api.js`.

```bash
npm i && npm run build
npx wrangler login
npx wrangler deploy
printf '%s' 'YOUR-MOD-CODE' | npx wrangler secret put RESTORE_MOD_SECRET
```

Rename `wrangler.jsonc` `name` for the new constituency. Set a **new** `RESTORE_MOD_SECRET`. Do not commit secrets.

**Reports API (optional Railway):** drop in `backend/server.js` from this repo (see `backend/PATCH.md`). Point `src/lib/api.ts` `RAILWAY_API` at the new host. Local tips: `npx wrangler dev --port 43190 --var RESTORE_MOD_SECRET:YOUR-MOD-CODE`. Frontend: `npm run dev` (port 43173).

## Ops — who refreshes what

Assign one Restore branch manager. Weekly (15–20 minutes), not a scraper:

| Cadence | File | Check |
| --- | --- | --- |
| Weekly | `council-notices-*.json` | Town/parish News/Notices page |
| Weekly | `events-*.json` | Venue What’s On, borough events filtered to the town, markets calendar, public recurring dates (show, 10k, Remembrance, PACT) |
| When published | `ecological-works-*.json` | Council transport / biodiversity PDFs |
| When the PDF updates | `hmo-*.json` | Licensed HMO register |
| Monthly / as needed | `planning-*.json` | Planning Explorer public search |
| After elections | `councillors-*.json`, `wards-*.json` | ModernGov + MapIt |
| Annual | `collisions-*.json` | DfT STATS19 |

Commit the JSON, rebuild, redeploy the Worker. If live FMS is empty, check Railway health and the RSS User-Agent notes in `backend/PATCH.md`.

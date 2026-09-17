# Restore · Penistone Insight Hub

Civic dashboard for Penistone East and West (Barnsley). Live [FixMyStreet](https://www.fixmystreet.com/) reports plus **approved community tips**.

## Live site

**https://restore-penistone.rust-quartz.workers.dev**

The preview Wrangler token from the cloud agent cannot update that claimed Worker. Redeploy from Nicky’s Cloudflare account (the one that claimed Rust Quartz):

```bash
npm i && npm run build && npx wrangler login && npx wrangler deploy && printf '%s' 'Restore-Penistone-K4m9Qx' | npx wrangler secret put RESTORE_MOD_SECRET
```

That keeps the same host. `RESTORE_MOD_SECRET` is `Restore-Penistone-K4m9Qx` (the mod code Nikeone already has). It is **not** stored in a committed `.env` — only set on the Worker via `wrangler secret put`.

On the site: expand **Moderator (shared code)** at the bottom, enter that code, then Approve or Reject. Approved tips get a **Community** badge; rejected stay off the map.

Facebook: Restore never posts. Copy or download the weekly **Restore brief** and paste it into groups yourself. Facebook URLs on tips are stored as links only — never fetched.

## Map views

A small set of **map views** replace the old wall of layer pills. FixMyStreet reports, community tips and recency stay on the map in every view.

- **Overview** (default) — wards, council notices, events, councillors, stale open reports, eco works
- **Events** — what’s on plus council notices
- **Streets & reports** — stale, collisions, notices
- **Housing** — licensed HMOs, planning, HMO planning
- **Travel & roads** — traffic cams, collisions, public paths, notices
- **Green & flood** — eco works, flood, paths, air quality

**More layers** still exposes every overlay for power users. It stays collapsed by default.

See [docs/CONSTITUENCY-BLUEPRINT.md](docs/CONSTITUENCY-BLUEPRINT.md) to copy this hub to another UK constituency.

## Town Council notices

Toggle is on in **Overview**, **Streets & reports** and **Travel & roads** (and via More layers). Teal map pins plus a thin list from `public/data/council-notices-penistone.json` — a curated snapshot of the public [News/Notices](https://penistonetowncouncil.gov.uk/news-notices/) page (~23 items: road closures, vacancies, station plans, PACT, elections, etc.).

Popups paraphrase the official notice and link to it. Pins use an approximate street or venue, not worksite GPS. **No Facebook or X scraping.**

**Refresh:** open the council News/Notices page, copy currently listed public items into the JSON (`id`, `title`, `date`, `summary`, `sourceUrl`, optional `lat`/`lng` and `area`). Keep paraphrases short; do not paste private or social-only posts. Nominatim / OSM is fine for public street centroids.

## Events / what’s on

Amber map pins plus the same thin **What’s on** list as notices (`public/data/events-penistone.json`). Default **on** in Overview and in the **Events** view.

Seeded from public pages only: Penistone Town Council (PACT, town assembly, Remembrance pattern), [Penistone Paramount What’s On](https://www.penistoneparamount.co.uk/whatson/live), [Barnsley local markets](https://www.barnsley.gov.uk/services/markets/local-markets/) (Thursday market, Super Saturdays, seasonal markets), [Barnsley events](https://my.barnsley.gov.uk/events/50436/gel-plate-printing) filtered to Penistone Library, [Penistone Show](https://penistoneshow.com/), [Norman Cole Penistone 10k](https://pfrac.co.uk/races/penistone-10k). **No Facebook/X scraping.** Skip TBC items.

**Refresh weekly:** Paramount listings, Barnsley markets calendar, borough What’s On (Penistone only), council notices for PACT / Remembrance / races. Fields: `id`, `title`, `start`, optional `end`, `place`, `area`, optional `lat`/`lng`, `summary`, `source`, `sourceUrl`.

## Planning overlays (separated)

- **Planning** — general Penistone/S36 applications (extensions, etc.) in `planning-penistone.json`
- **HMO planning** — applications matching HMO / house in multiple occupation searches (`planning-hmo.json`), borough-wide. This is **not** the licensed HMO register layer.

Toggle **Planning** for general apps. Snapshot of Barnsley Planning Explorer public search for Penistone with **S36** postcodes (`public/data/planning-penistone.json`, capped recent sample). Popups link to official ApplicationDetails. Refresh by re-running the public SimpleSearch extract.

## Flood overlay

Toggle **Flood**. Nearby Environment Agency flood **areas** (static snapshot) plus **live** alerts from the EA flood-monitoring API (no key). Attribution: Environment Agency / Open Government Licence.

## HMO overlay

Toggle **HMO** on the map. Data is from Barnsley’s public licensed HMO PDF ([register](https://www.barnsley.gov.uk/media/zebimlz3/hmo-register.pdf)), **full borough** (~192 properties), geocoded by postcode centroid. Snapshot: `public/data/hmo-penistone.json`. Refresh by re-parsing the PDF. No licence-holder personal details; no third-party scrapes.

## What you get

- Leaflet map of live FixMyStreet reports (Railway RSS) plus approved community tips
- **Map views** instead of a wall of layer pills (Overview / Events / Streets / Housing / Travel / Green), with More layers when needed
- Town Council notices and public events as pins plus a thin What’s on list
- Every popup labelled **FixMyStreet** or **Community tip**
- Stats, prioritised needs, recurring issues, timeframe filter, newest-reports strip, top needs this week / stale signal
- Community tip form (optional street, category, map pin, photo URL, FMS/Facebook link)
- Weekly Restore brief (copy + `.txt` download)

FixMyStreet data: https://penistone-insight-backend-production.up.railway.app/api/reports  
Tips API: `GET/POST /api/tips` on the Worker (Durable Object SQLite)

## Run locally

```bash
npm i
npm run dev
```

http://127.0.0.1:43173 — FMS from Railway. For tips locally, also run `npx wrangler dev --port 43190 --var RESTORE_MOD_SECRET:Restore-Penistone-K4m9Qx`.

## Known gaps

- Until Nicky runs the deploy one-liner above, the public URL may still be the older build (map + FMS only).
- Recurrence (3+ on one street) depends on the short FixMyStreet RSS window plus approved tips.


## Extra layers (2026-09-13)

- **Collisions** — DfT STATS19 2025 (Barnsley/Penistone area)
- **Traffic cams** — National Highways motorway/trunk traffic CCTV near M1 J35–J37 (Barnsley/Hoyland/Chapeltown). Pins are approximate junction locations. Popups open a live camera page (motorwaycameras.co.uk republishes NH traffic CCTV). This is **not** Barnsley street or town-centre public-space CCTV — that is not published as open data.
- **Paths** — Barnsley PROW via rowmaps (informational; Definitive Map is legal source)
- **Air** — nearest DEFRA UK-AIR stations
- Removed: police.uk crime pins (anonymised / fuzzed locations were not useful)
- Skipped: Barnsley street CCTV (no official open data); NCR EV registry decommissioned; SY speed cameras need FOI snapshot

## Ward boundaries

Toggle **Wards** (on by default). Light-fill polygons for **Penistone East** (GSS E05000989) and **Penistone West** (GSS E05000990) from [mySociety MapIt](https://mapit.mysociety.org/) GeoJSON (`/area/8741.geojson` and `/area/8740.geojson`), simplified into `public/data/wards-penistone.json`.

Attribution: Contains Ordnance Survey data © Crown copyright and database right; Contains National Statistics data © Crown copyright and database right; retrieved via MapIt. The Local Government Boundary Commission for England **Barnsley (Electoral Changes) Order 2025** may revise ward shapes for later elections — this snapshot is the MapIt ward polygons used for the current Penistone East/West seats.

## Stale / unfixed heatmap

Toggle **Stale** (on by default; count on the button). Open FixMyStreet reports already in the live Railway feed, plus approved community tips that have a usable date. Older than **14 days** = stale; older than **45 days** = very stale (larger, warmer halo). Items without a parseable date are skipped. No extra private data.

## Councillor / casework pack

The **Councillors** panel lists sitting Penistone East and West members from the public Barnsley ModernGov directory (`public/data/councillors-penistone.json`, as of 2026-09 after the East by-election). Mailto/tel and “Open council profile” only. **Public Barnsley councillor contacts · not a marked register · no electors.** Map pins sit at approximate ward centroids when the Councillors layer is on. Report popups can name that ward’s councillors via a point-in-polygon check on the MapIt shapes.

## Timeframes / newest first

**Timeframe** chips: Today · This week · Older · All (default **All**, newest first). Filters the map, stats, Needs, Recurring and Restore brief together.

- Lists of FixMyStreet + approved community tips sort **newest first**. Needs stays priority-ranked and shows a clear **latest** relative time, plus a **Newest reports** strip and a Newest tab.
- Map pins **fade by age**: today strongest (larger, brighter stroke, higher opacity), this week strong, last 30 days medium, older clearly faded. Type colours stay; size and opacity carry recency. Newest pins draw on top. The **Stale** layer is separate: still-open after 14 / 45 days (orange halo). Age fade is not stale.
- Relative times use `formatRelative` in `src/lib/recency.ts` on top of existing `ts` / `formatWhen` / `reportTimestamp` helpers.

## Planned ecological works

Toggle **Eco works** (on by default). Green markers and dashed corridor lines from `public/data/ecological-works-penistone.json` — a short curated set from **public Barnsley documents**, not a live contractor feed.

- Penistone–Wortley TPT Active Travel Scheme (hedgerow planting and other biodiversity improvements): [scheme PDF](https://www.barnsley.gov.uk/media/ttmnrytl/penistone-to-wortley-tpt-scheme.pdf) and [transport projects](https://www.barnsley.gov.uk/services/roads-travel-and-parking/transport-projects/)
- TPT glow-worm vegetation at Thurgoland, wildflower meadows Dunford–Penistone, trees retained as habitat, plus planned heath / hedgerow / glow-worm management plan: [Biodiversity Duty Report](https://www.barnsley.gov.uk/media/hybhoxcq/biodiversity-duty-report.pdf) (glow-worm context also on [barnsleybiodiversity.org.uk](http://barnsleybiodiversity.org.uk/glowworm.html))

Popups carry title, planned/ongoing status, a short paraphrase, and a link to the official source. Honesty line: **Public council / biodiversity plans · approximate locations · not live contractor GPS.** No private Facebook scrapes; Friends of the Earth meadow listings skipped (no public site without a private address).

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
- Every popup labelled **FixMyStreet** or **Community tip**
- Stats, prioritised needs, recurring issues, top needs this week / stale signal
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

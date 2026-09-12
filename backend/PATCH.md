# Railway backend patch (drop-in)

The live service at
`https://penistone-insight-backend-production.up.railway.app`
returns `{ count: 0 }` because FixMyStreet answers **418/503** to a Chrome-like
User-Agent, and the ward feeds append `?type=MTW` (also 503).

This folder is a drop-in replacement for
https://github.com/nikeone1/penistone-insight-backend
(`server.js` + `package.json` only). It still uses **RSS only** — no HTML scraping.

## What changed

1. User-Agent is now `Restore/1.0 (Penistone Insight Hub)` (plain UA works; Chrome UA does not).
2. Ward URLs no longer include `?type=MTW`.
3. Borough keyword filter is unchanged (plus Thurgoland, which the original comments already mentioned).
4. `GET /health` reports `lastFetch` and per-source counts.
5. CORS stays open (`cors()`).

## Apply on Railway

In the backend repo, replace `server.js` with this file (and optionally drop the unused `cheerio` dependency). Redeploy. No env vars required.

```bash
# from this project
cp backend/server.js /path/to/penistone-insight-backend/server.js
```

Until Railway is redeployed, the Restore frontend tries that URL first, then
falls back to the same-origin Worker feed (identical RSS parser) so the public
site still shows live FixMyStreet reports.

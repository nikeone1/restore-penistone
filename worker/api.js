const RAILWAY = 'https://penistone-insight-backend-production.up.railway.app';
const PENISTONE = { lat: 53.525, lng: -1.628 };
const TYPES = new Set(['pothole', 'litter', 'lighting', 'asb', 'other']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Restore-Mod',
  'Access-Control-Max-Age': '86400'
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });
}

function safeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i += 1) out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return out === 0;
}

function authorised(request, env) {
  const secret = env.RESTORE_MOD_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get('X-Restore-Mod') || '', secret);
}

function hashIp(ip) {
  let h = 2166136261;
  const s = String(ip || 'unknown');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function cleanText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanUrl(value) {
  const raw = cleanText(value, 500);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export class TipStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  ensure() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        loc TEXT,
        area TEXT,
        type TEXT,
        lat REAL,
        lng REAL,
        url TEXT,
        media TEXT,
        desc TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        moderated_at INTEGER,
        ip_hash TEXT
      )
    `);
  }

  async fetch(request) {
    this.ensure();
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/approved') {
      const rows = this.ctx.storage.sql.exec(
        "SELECT * FROM tips WHERE status = 'approved' ORDER BY created_at DESC"
      ).toArray();
      return json({ count: rows.length, tips: rows });
    }

    if (request.method === 'GET' && path === '/mod') {
      const rows = this.ctx.storage.sql.exec(
        "SELECT * FROM tips ORDER BY created_at DESC"
      ).toArray();
      return json({
        pending: rows.filter((t) => t.status === 'pending'),
        approved: rows.filter((t) => t.status === 'approved'),
        rejected: rows.filter((t) => t.status === 'rejected')
      });
    }

    if (request.method === 'POST' && path === '/submit') {
      const body = await request.json().catch(() => ({}));
      const desc = cleanText(body.desc, 500);
      if (desc.length < 8) return json({ error: 'Please add a short description (8+ characters).' }, 400);

      const ipHash = hashIp(request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'local');
      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recent = this.ctx.storage.sql.exec(
        "SELECT COUNT(*) AS n FROM tips WHERE ip_hash = ? AND created_at > ?",
        ipHash,
        hourAgo
      ).toArray();
      if ((recent[0]?.n || 0) >= 8) return json({ error: 'Too many tips from this connection. Try again later.' }, 429);

      const type = TYPES.has(body.type) ? body.type : 'other';
      const loc = cleanText(body.loc, 120) || 'Penistone (approximate)';
      const area = cleanText(body.area, 80) || 'Penistone';
      const title = cleanText(body.title, 120) || desc.slice(0, 80);
      let lat = Number(body.lat);
      let lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        lat = PENISTONE.lat;
        lng = PENISTONE.lng;
      }
      if (lat < 53.45 || lat > 53.6 || lng < -1.75 || lng > -1.48) {
        lat = PENISTONE.lat;
        lng = PENISTONE.lng;
      }

      const tip = {
        id: crypto.randomUUID(),
        title,
        loc,
        area,
        type,
        lat,
        lng,
        url: cleanUrl(body.url),
        media: cleanUrl(body.media),
        desc,
        status: 'pending',
        created_at: Date.now(),
        moderated_at: null,
        ip_hash: ipHash
      };

      this.ctx.storage.sql.exec(
        `INSERT INTO tips (id, title, loc, area, type, lat, lng, url, media, desc, status, created_at, moderated_at, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tip.id, tip.title, tip.loc, tip.area, tip.type, tip.lat, tip.lng,
        tip.url, tip.media, tip.desc, tip.status, tip.created_at, tip.moderated_at, tip.ip_hash
      );

      return json({ ok: true, id: tip.id, status: 'pending' }, 201);
    }

    if (request.method === 'POST' && path.startsWith('/moderate/')) {
      const id = path.slice('/moderate/'.length);
      const body = await request.json().catch(() => ({}));
      const action = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : '';
      if (!action) return json({ error: 'action must be approve or reject' }, 400);
      const existing = this.ctx.storage.sql.exec('SELECT id FROM tips WHERE id = ?', id).toArray();
      if (!existing.length) return json({ error: 'Tip not found' }, 404);
      this.ctx.storage.sql.exec(
        'UPDATE tips SET status = ?, moderated_at = ? WHERE id = ?',
        action,
        Date.now(),
        id
      );
      return json({ ok: true, id, status: action });
    }

    return json({ error: 'Not found' }, 404);
  }
}

function tipsStub(env) {
  return env.TIPS.get(env.TIPS.idFromName('penistone'));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'Restore / Penistone Insight Hub',
        tips: 'durable-object',
        railway: RAILWAY
      });
    }

    if (url.pathname === '/api/reports') {
      try {
        const upstream = await fetch(`${RAILWAY}/api/reports`, {
          headers: { Accept: 'application/json', 'User-Agent': 'Restore/1.0 (Penistone Insight Hub)' }
        });
        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
        });
      } catch (err) {
        return json({ updated: null, count: 0, reports: [], error: err instanceof Error ? err.message : 'Railway unreachable' }, 502);
      }
    }

    if (url.pathname === '/api/tips' && request.method === 'GET') {
      return tipsStub(env).fetch(new Request('https://tips.restore/approved', { method: 'GET' }));
    }

    if (url.pathname === '/api/tips' && request.method === 'POST') {
      const forwarded = new Request('https://tips.restore/submit', {
        method: 'POST',
        headers: request.headers,
        body: request.body
      });
      return tipsStub(env).fetch(forwarded);
    }

    if (url.pathname === '/api/tips/mod' && request.method === 'GET') {
      if (!env.RESTORE_MOD_SECRET) return json({ error: 'RESTORE_MOD_SECRET is not set on the Worker.' }, 503);
      if (!authorised(request, env)) return json({ error: 'Wrong moderation code.' }, 401);
      return tipsStub(env).fetch(new Request('https://tips.restore/mod', { method: 'GET' }));
    }

    const moderate = url.pathname.match(/^\/api\/tips\/([^/]+)\/moderate$/);
    if (moderate && request.method === 'POST') {
      if (!env.RESTORE_MOD_SECRET) return json({ error: 'RESTORE_MOD_SECRET is not set on the Worker.' }, 503);
      if (!authorised(request, env)) return json({ error: 'Wrong moderation code.' }, 401);
      return tipsStub(env).fetch(new Request(`https://tips.restore/moderate/${moderate[1]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: request.body
      }));
    }

    return env.ASSETS.fetch(request);
  }
};

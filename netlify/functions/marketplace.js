import { createClient } from '@supabase/supabase-js';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-name, x-user-tier',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function ok(body) {
  return json(200, body);
}

function toStr(v) {
  return v == null ? '' : String(v);
}

function getUserId(event) {
  return toStr(event.headers?.['x-user-id'] || event.headers?.['X-User-Id'] || '').trim();
}

function getUserTier(event) {
  return toStr(event.headers?.['x-user-tier'] || event.headers?.['X-User-Tier'] || 'free');
}

const tierOrder = { free: 0, pro: 1, creator: 2, business: 3, exclusive: 4 };
function hasTier(tier, min) {
  return (tierOrder[tier] ?? 0) >= (tierOrder[min] ?? 0);
}

function getSubpath(event) {
  const p = toStr(event.path || '');
  const idx = p.indexOf('/.netlify/functions/marketplace');
  const base = idx >= 0 ? p.slice(idx + '/.netlify/functions/marketplace'.length) : p;
  return base.startsWith('/') ? base : `/${base}`;
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function sanitizeAdMedia(media) {
  const arr = Array.isArray(media) ? media : [];
  return arr
    .map((m) => {
      const url = toStr(m?.url).trim();
      const type = m?.type === 'video' ? 'video' : 'image';
      if (!url) return null;
      // allow https URLs and data URLs for lightweight uploads
      const ok =
        url.startsWith('https://') ||
        url.startsWith('http://') ||
        url.startsWith('data:image/') ||
        url.startsWith('data:video/');
      if (!ok) return null;
      return { type, url };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function requireBusinessOrHigher(tier) {
  if (!hasTier(tier, 'business')) {
    return json(403, { error: 'tier_required', required: 'business' });
  }
  return null;
}

function requireUserId(userId) {
  if (!userId) {
    return json(401, { error: 'unauthorized', message: 'missing auth' });
  }
  return null;
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing_supabase_env');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBearerToken(event) {
  const raw = toStr(event.headers?.authorization || event.headers?.Authorization || '');
  if (!raw) return '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function getAuthContext(sb, event) {
  const token = getBearerToken(event);
  if (!token) {
    return {
      userId: getUserId(event),
      tier: getUserTier(event),
      from: 'headers',
    };
  }

  try {
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) {
      return {
        userId: getUserId(event),
        tier: getUserTier(event),
        from: 'headers',
      };
    }

    const u = data.user;
    let profileTier = '';
    try {
      const { data: profile, error: pErr } = await sb
        .from('profiles')
        .select('tier')
        .eq('id', u.id)
        .maybeSingle();
      if (!pErr && profile?.tier) profileTier = toStr(profile.tier);
    } catch {
    }

    const metaTier = toStr(u.user_metadata?.tier || u.app_metadata?.tier || '');
    return {
      userId: u.id,
      tier: profileTier || metaTier || getUserTier(event),
      from: 'supabase',
    };
  } catch {
    return {
      userId: getUserId(event),
      tier: getUserTier(event),
      from: 'headers',
    };
  }
}

function absolutize(baseUrl, maybeRelative) {
  try {
    const u = new URL(maybeRelative, baseUrl);
    return u.toString();
  } catch {
    return null;
  }
}

function extractAssets(html, baseUrl) {
  const assets = [];

  // OpenGraph
  const ogImage = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  const ogVideo = [...html.matchAll(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);

  for (const u of ogVideo) {
    const abs = absolutize(baseUrl, u);
    if (abs) assets.push({ type: 'video', url: abs });
  }
  for (const u of ogImage) {
    const abs = absolutize(baseUrl, u);
    if (abs) assets.push({ type: 'image', url: abs });
  }

  // Images
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  for (const u of imgs) {
    const abs = absolutize(baseUrl, u);
    if (abs) assets.push({ type: 'image', url: abs });
  }

  // Videos
  const vids = [...html.matchAll(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  for (const u of vids) {
    const abs = absolutize(baseUrl, u);
    if (abs) assets.push({ type: 'video', url: abs });
  }

  // Deduplicate + limit
  const seen = new Set();
  const out = [];
  for (const a of assets) {
    const key = `${a.type}:${a.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= 8) break;
  }
  return out;
}

const DEMO = {
  id: 'demo-novabuild',
  name: 'NovaBuild Solutions',
  websiteUrl: 'https://novabuild.example',
  description:
    'Premium modular construction for luxury residences and commercial spaces. Rapid delivery. Quiet elegance. Engineered durability.',
  tier: 'exclusive',
  isDemo: true,
  assets: [
    { type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1523413457903-3e5d6b2b31f0?auto=format&fit=crop&w=1600&q=80' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80' },
  ],
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-name, x-user-tier',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      },
      body: '',
    };
  }

  let sb;
  try {
    sb = supabaseAdmin();
  } catch {
    return json(500, { error: 'missing_supabase_env', required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] });
  }

  const auth = await getAuthContext(sb, event);
  const tier = auth.tier;
  const userId = auth.userId;
  const sub = getSubpath(event);
  const parts = sub.split('/').filter(Boolean);

  try {
    // GET /featured
    if (event.httpMethod === 'GET' && parts.length === 1 && parts[0] === 'featured') {
      const { data, error } = await sb
        .from('marketplace_businesses')
        .select('id,name,website_url,description,tier,is_demo,assets,featured_rank,created_at')
        .order('featured_rank', { ascending: true })
        .limit(20);
      if (error) return json(500, { error: 'db_error', message: error.message });

      const mapped = (data || []).map((b) => ({
        id: b.id,
        name: b.name,
        websiteUrl: b.website_url,
        description: b.description,
        tier: b.tier || 'exclusive',
        isDemo: !!b.is_demo,
        assets: Array.isArray(b.assets) ? b.assets : [],
      }));

      const withoutDemoDup = mapped.filter((x) => x.id !== DEMO.id);
      return ok([DEMO, ...withoutDemoDup]);
    }

    // POST /scrape
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'scrape') {
      const body = parseBody(event);
      const websiteUrl = toStr(body.websiteUrl).trim();
      if (!websiteUrl) return json(400, { error: 'missing_fields' });

      const res = await fetch(websiteUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'FaceMeX Marketplace Bot/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const html = await res.text();
      const assets = extractAssets(html, websiteUrl);
      return ok({ websiteUrl, assets });
    }

    // POST /businesses (create)
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'businesses') {
      if (!hasTier(tier, 'exclusive')) {
        return json(403, { error: 'tier_required', required: 'exclusive' });
      }

      const body = parseBody(event);
      const name = toStr(body.name).trim();
      const websiteUrl = toStr(body.websiteUrl).trim();
      const description = toStr(body.description).trim();

      if (!name || !websiteUrl || !description) return json(400, { error: 'missing_fields' });

      let assets = Array.isArray(body.assets) ? body.assets : [];
      assets = assets
        .map((a) => ({ type: a?.type === 'video' ? 'video' : 'image', url: toStr(a?.url) }))
        .filter((a) => a.url)
        .slice(0, 8);

      const id = `mb${Date.now()}`;
      const row = {
        id,
        name,
        website_url: websiteUrl,
        description,
        tier: 'exclusive',
        is_demo: false,
        assets,
        featured_rank: 50,
      };

      const { error } = await sb.from('marketplace_businesses').insert(row);
      if (error) return json(500, { error: 'db_error', message: error.message });

      return json(201, {
        id,
        name,
        websiteUrl,
        description,
        tier: 'exclusive',
        isDemo: false,
        assets,
      });
    }

    // GET /ads
    if (event.httpMethod === 'GET' && parts.length === 1 && parts[0] === 'ads') {
      const { data, error } = await sb
        .from('marketplace_ads')
        .select('id,creator_id,creator_tier,title,description,website_url,media,status,created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return json(500, { error: 'db_error', message: error.message });

      const mapped = (data || []).map((a) => ({
        id: a.id,
        creatorId: a.creator_id,
        creatorTier: a.creator_tier,
        title: a.title,
        description: a.description,
        websiteUrl: a.website_url || null,
        media: Array.isArray(a.media) ? a.media : [],
        status: a.status,
        createdAt: a.created_at,
      }));

      return ok(mapped);
    }

    // GET /ads/mine
    if (event.httpMethod === 'GET' && parts.length === 2 && parts[0] === 'ads' && parts[1] === 'mine') {
      const tierErr = requireBusinessOrHigher(tier);
      if (tierErr) return tierErr;
      const userErr = requireUserId(userId);
      if (userErr) return userErr;

      const { data, error } = await sb
        .from('marketplace_ads')
        .select('id,creator_id,creator_tier,title,description,website_url,media,status,created_at')
        .eq('creator_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return json(500, { error: 'db_error', message: error.message });

      const mapped = (data || []).map((a) => ({
        id: a.id,
        creatorId: a.creator_id,
        creatorTier: a.creator_tier,
        title: a.title,
        description: a.description,
        websiteUrl: a.website_url || null,
        media: Array.isArray(a.media) ? a.media : [],
        status: a.status,
        createdAt: a.created_at,
      }));

      return ok(mapped);
    }

    // POST /ads (create) - free for business + exclusive
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'ads') {
      const tierErr = requireBusinessOrHigher(tier);
      if (tierErr) return tierErr;
      const userErr = requireUserId(userId);
      if (userErr) return userErr;

      const body = parseBody(event);
      const title = toStr(body.title).trim();
      const description = toStr(body.description).trim();
      const websiteUrl = toStr(body.websiteUrl || body.website_url).trim();
      const media = sanitizeAdMedia(body.media);

      if (!title || !description) return json(400, { error: 'missing_fields' });

      const id = `mad${Date.now()}`;
      const row = {
        id,
        creator_id: userId,
        creator_tier: tier,
        title,
        description,
        website_url: websiteUrl || null,
        media,
        status: 'active',
      };

      const { error } = await sb.from('marketplace_ads').insert(row);
      if (error) return json(500, { error: 'db_error', message: error.message });

      return json(201, {
        id,
        creatorId: userId,
        creatorTier: tier,
        title,
        description,
        websiteUrl: websiteUrl || null,
        media,
        status: 'active',
      });
    }

    // PATCH /ads/:id (pause/resume)
    if (event.httpMethod === 'PATCH' && parts.length === 2 && parts[0] === 'ads') {
      const tierErr = requireBusinessOrHigher(tier);
      if (tierErr) return tierErr;
      const userErr = requireUserId(userId);
      if (userErr) return userErr;

      const adId = toStr(parts[1]).trim();
      if (!adId) return json(400, { error: 'missing_fields' });

      const body = parseBody(event);
      const desiredStatus = toStr(body.status).trim();
      const nextStatus = desiredStatus === 'paused' ? 'paused' : desiredStatus === 'active' ? 'active' : '';
      if (!nextStatus) return json(400, { error: 'invalid_status', allowed: ['active', 'paused'] });

      const { data: existing, error: readErr } = await sb
        .from('marketplace_ads')
        .select('id,creator_id,status')
        .eq('id', adId)
        .maybeSingle();
      if (readErr) return json(500, { error: 'db_error', message: readErr.message });
      if (!existing || existing.status === 'deleted') return json(404, { error: 'not_found' });
      if (existing.creator_id !== userId) return json(403, { error: 'forbidden' });

      const { error: upErr } = await sb.from('marketplace_ads').update({ status: nextStatus }).eq('id', adId);
      if (upErr) return json(500, { error: 'db_error', message: upErr.message });

      return ok({ id: adId, status: nextStatus });
    }

    // DELETE /ads/:id (soft delete)
    if (event.httpMethod === 'DELETE' && parts.length === 2 && parts[0] === 'ads') {
      const tierErr = requireBusinessOrHigher(tier);
      if (tierErr) return tierErr;
      const userErr = requireUserId(userId);
      if (userErr) return userErr;

      const adId = toStr(parts[1]).trim();
      if (!adId) return json(400, { error: 'missing_fields' });

      const { data: existing, error: readErr } = await sb
        .from('marketplace_ads')
        .select('id,creator_id,status')
        .eq('id', adId)
        .maybeSingle();
      if (readErr) return json(500, { error: 'db_error', message: readErr.message });
      if (!existing || existing.status === 'deleted') return json(404, { error: 'not_found' });
      if (existing.creator_id !== userId) return json(403, { error: 'forbidden' });

      const { error: delErr } = await sb.from('marketplace_ads').update({ status: 'deleted' }).eq('id', adId);
      if (delErr) return json(500, { error: 'db_error', message: delErr.message });

      return json(204, null);
    }

    return json(404, { error: 'not_found' });
  } catch (err) {
    return json(500, { error: 'server_error', message: err?.message || String(err) });
  }
};

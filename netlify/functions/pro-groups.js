import { createClient } from '@supabase/supabase-js';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-name, x-user-tier',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
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
  return toStr(event.headers?.['x-user-id'] || event.headers?.['X-User-Id'] || '1');
}

function getUserName(event) {
  return toStr(event.headers?.['x-user-name'] || event.headers?.['X-User-Name'] || 'FaceMe User');
}

function getUserTier(event) {
  return toStr(event.headers?.['x-user-tier'] || event.headers?.['X-User-Tier'] || 'free');
}

const tierOrder = { free: 0, pro: 1, creator: 2, business: 3, exclusive: 4 };
function hasTier(tier, min) {
  return (tierOrder[tier] ?? 0) >= (tierOrder[min] ?? 0);
}

function sanitizeAttachments(input) {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((f) => ({
      name: toStr(f?.name).slice(0, 160),
      type: toStr(f?.type).slice(0, 80),
      dataUrl: toStr(f?.dataUrl),
    }))
    .filter((f) => f.name && f.type && f.dataUrl && (f.type.startsWith('image/') || f.type.startsWith('video/')));
}

function sanitizeVoiceNote(input) {
  const v = input || {};
  const type = toStr(v?.type).slice(0, 80);
  const dataUrl = toStr(v?.dataUrl);
  const durationMs = Number(v?.durationMs || 0) || 0;
  if (!type || !dataUrl) return null;
  if (!type.startsWith('audio/')) return null;
  return {
    type,
    dataUrl,
    durationMs: Math.max(0, Math.min(durationMs, 10 * 60 * 1000)),
  };
}

function getSubpath(event) {
  const p = toStr(event.path || '');
  const idx = p.indexOf('/.netlify/functions/pro-groups');
  const base = idx >= 0 ? p.slice(idx + '/.netlify/functions/pro-groups'.length) : p;
  return base.startsWith('/') ? base : `/${base}`;
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing_supabase_env');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-name, x-user-tier',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
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

  const userId = getUserId(event);
  const userName = getUserName(event);
  const tier = getUserTier(event);

  const sub = getSubpath(event);
  const parts = sub.split('/').filter(Boolean);

  try {
    // GET / => list
    if (event.httpMethod === 'GET' && parts.length === 0) {
      const { data: groups, error } = await sb
        .from('pro_groups')
        .select('id,name,industry,description,created_at,owner_id,admin_ids');
      if (error) return json(500, { error: 'db_error', message: error.message });

      const groupIds = (groups || []).map((g) => g.id);

      const { data: memberRows } = await sb
        .from('pro_group_memberships')
        .select('group_id,user_id')
        .in('group_id', groupIds);

      const membersByGroup = new Map();
      for (const r of memberRows || []) {
        const gid = r.group_id;
        if (!membersByGroup.has(gid)) membersByGroup.set(gid, []);
        membersByGroup.get(gid).push(r.user_id);
      }

      const out = (groups || []).map((g) => {
        const members = membersByGroup.get(g.id) || [];
        return {
          id: g.id,
          name: g.name,
          industry: g.industry,
          description: g.description,
          createdAt: g.created_at,
          ownerId: g.owner_id,
          adminIds: g.admin_ids || [],
          memberCount: members.length,
          joined: members.includes(userId),
        };
      });

      return ok(out);
    }

    // GET /:groupId => group + posts + comments
    if (event.httpMethod === 'GET' && parts.length === 1) {
      const groupId = parts[0];

      const { data: group, error } = await sb
        .from('pro_groups')
        .select('id,name,industry,description,created_at,owner_id,admin_ids')
        .eq('id', groupId)
        .maybeSingle();
      if (error) return json(500, { error: 'db_error', message: error.message });
      if (!group) return json(404, { error: 'group_not_found' });

      const { data: memberships } = await sb
        .from('pro_group_memberships')
        .select('user_id')
        .eq('group_id', groupId);

      const memberIds = (memberships || []).map((m) => m.user_id);
      const joined = memberIds.includes(userId);
      const adminIds = Array.isArray(group.admin_ids) ? group.admin_ids : [];

      const { data: posts } = await sb
        .from('pro_group_posts')
        .select('id,group_id,author_id,author_name,content,attachments,created_at,announcement,pinned,like_user_ids')
        .eq('group_id', groupId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      const postIds = (posts || []).map((p) => p.id);

      const { data: comments } = await sb
        .from('pro_group_comments')
        .select('id,post_id,author_id,author_name,voice_note,created_at')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      const commentsByPost = new Map();
      for (const c of comments || []) {
        if (!commentsByPost.has(c.post_id)) commentsByPost.set(c.post_id, []);
        commentsByPost.get(c.post_id).push({
          id: c.id,
          authorId: c.author_id,
          authorName: c.author_name,
          voiceNote: c.voice_note,
          createdAt: c.created_at,
        });
      }

      const payloadPosts = (posts || []).map((p) => ({
        id: p.id,
        groupId: p.group_id,
        authorId: p.author_id,
        authorName: p.author_name,
        content: p.content || '',
        attachments: p.attachments || [],
        createdAt: p.created_at,
        announcement: !!p.announcement,
        pinned: !!p.pinned,
        likeUserIds: p.like_user_ids || [],
        comments: commentsByPost.get(p.id) || [],
      }));

      return ok({
        group: {
          id: group.id,
          name: group.name,
          industry: group.industry,
          description: group.description,
          createdAt: group.created_at,
          ownerId: group.owner_id,
          adminIds,
          memberCount: memberIds.length,
          joined,
          isAdmin: adminIds.includes(userId),
        },
        posts: payloadPosts,
      });
    }

    // POST /:groupId/join or leave
    if (event.httpMethod === 'POST' && parts.length === 2 && (parts[1] === 'join' || parts[1] === 'leave')) {
      const groupId = parts[0];
      const action = parts[1];

      if (action === 'join') {
        await sb.from('pro_group_memberships').upsert({ group_id: groupId, user_id: userId });
      } else {
        await sb.from('pro_group_memberships').delete().eq('group_id', groupId).eq('user_id', userId);
      }

      return ok({ ok: true });
    }

    // POST /:groupId/posts
    if (event.httpMethod === 'POST' && parts.length === 2 && parts[1] === 'posts') {
      const groupId = parts[0];
      const body = parseBody(event);

      const content = toStr(body.content).trim();
      const announcement = !!body.announcement;
      const attachments = sanitizeAttachments(body.attachments);

      // membership required
      const { data: membership } = await sb
        .from('pro_group_memberships')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!membership) return json(403, { error: 'membership_required' });

      if (!content && attachments.length === 0) return json(400, { error: 'missing_fields' });

      // announcement gate: admin + creator
      if (announcement) {
        if (!hasTier(tier, 'creator')) return json(403, { error: 'tier_required', required: 'creator' });
        const { data: group } = await sb
          .from('pro_groups')
          .select('admin_ids')
          .eq('id', groupId)
          .maybeSingle();
        const adminIds = Array.isArray(group?.admin_ids) ? group.admin_ids : [];
        if (!adminIds.includes(userId)) return json(403, { error: 'admin_required' });
      }

      const id = `pgp${Date.now()}`;
      const createdAt = new Date().toISOString();
      const row = {
        id,
        group_id: groupId,
        author_id: userId,
        author_name: userName,
        content,
        attachments,
        created_at: createdAt,
        announcement,
        pinned: false,
        like_user_ids: [],
      };

      const { error } = await sb.from('pro_group_posts').insert(row);
      if (error) return json(500, { error: 'db_error', message: error.message });

      return json(201, {
        id,
        groupId,
        authorId: userId,
        authorName: userName,
        content,
        attachments,
        createdAt,
        announcement,
        pinned: false,
        likeUserIds: [],
        comments: [],
      });
    }

    // POST /:groupId/posts/:postId/like
    if (event.httpMethod === 'POST' && parts.length === 4 && parts[1] === 'posts' && parts[3] === 'like') {
      const groupId = parts[0];
      const postId = parts[2];

      const { data: post, error } = await sb
        .from('pro_group_posts')
        .select('id,like_user_ids')
        .eq('id', postId)
        .eq('group_id', groupId)
        .maybeSingle();
      if (error) return json(500, { error: 'db_error', message: error.message });
      if (!post) return json(404, { error: 'post_not_found' });

      const list = Array.isArray(post.like_user_ids) ? post.like_user_ids : [];
      const has = list.includes(userId);
      const next = has ? list.filter((id) => id !== userId) : [userId, ...list];

      await sb.from('pro_group_posts').update({ like_user_ids: next }).eq('id', postId);
      return ok({ ok: true, liked: !has, likeCount: next.length });
    }

    // POST /:groupId/posts/:postId/comments (voice only, creator+)
    if (event.httpMethod === 'POST' && parts.length === 4 && parts[1] === 'posts' && parts[3] === 'comments') {
      const groupId = parts[0];
      const postId = parts[2];
      const body = parseBody(event);

      if (!hasTier(tier, 'creator')) {
        return json(403, { error: 'tier_required', required: 'creator' });
      }

      const voiceNote = sanitizeVoiceNote(body.voiceNote);
      if (!voiceNote) return json(400, { error: 'voice_note_required' });

      const id = `pgc${Date.now()}`;
      const createdAt = new Date().toISOString();

      const { error } = await sb.from('pro_group_comments').insert({
        id,
        group_id: groupId,
        post_id: postId,
        author_id: userId,
        author_name: userName,
        voice_note: voiceNote,
        created_at: createdAt,
      });
      if (error) return json(500, { error: 'db_error', message: error.message });

      return json(201, {
        id,
        authorId: userId,
        authorName: userName,
        voiceNote,
        createdAt,
      });
    }

    // PATCH /:groupId/posts/:postId/pin (admin + creator)
    if (event.httpMethod === 'PATCH' && parts.length === 4 && parts[1] === 'posts' && parts[3] === 'pin') {
      const groupId = parts[0];
      const postId = parts[2];
      const body = parseBody(event);
      const pinned = !!body.pinned;

      if (!hasTier(tier, 'creator')) {
        return json(403, { error: 'tier_required', required: 'creator' });
      }

      const { data: group } = await sb
        .from('pro_groups')
        .select('admin_ids')
        .eq('id', groupId)
        .maybeSingle();
      const adminIds = Array.isArray(group?.admin_ids) ? group.admin_ids : [];
      if (!adminIds.includes(userId)) return json(403, { error: 'admin_required' });

      if (pinned) {
        await sb.from('pro_group_posts').update({ pinned: false }).eq('group_id', groupId);
      }
      await sb.from('pro_group_posts').update({ pinned }).eq('id', postId).eq('group_id', groupId);

      return ok({ ok: true });
    }

    return json(404, { error: 'not_found' });
  } catch (err) {
    return json(500, { error: 'server_error', message: err?.message || String(err) });
  }
};

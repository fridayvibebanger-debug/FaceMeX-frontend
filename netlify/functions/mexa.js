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

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function normalizeMessage(message) {
  return String(message || '').trim();
}

function resolveRoute(message) {
  const text = normalizeMessage(message).toLowerCase();

  if (/(open|go to|show|take me to|launch)\s+(career|jobs|marketplace|business|messages|notifications|profile|settings|connect|study|feed|safety)/i.test(text)) {
    if (text.includes('career')) return { route: '/career-ai', tool: { type: 'navigate', route: '/career-ai' } };
    if (text.includes('jobs')) return { route: '/jobs', tool: { type: 'navigate', route: '/jobs' } };
    if (text.includes('marketplace')) return { route: '/marketplace', tool: { type: 'navigate', route: '/marketplace' } };
    if (text.includes('messages')) return { route: '/messages', tool: { type: 'navigate', route: '/messages' } };
    if (text.includes('notifications')) return { route: '/notifications', tool: { type: 'navigate', route: '/notifications' } };
    if (text.includes('profile')) return { route: '/profile', tool: { type: 'navigate', route: '/profile' } };
    if (text.includes('settings')) return { route: '/settings', tool: { type: 'navigate', route: '/settings' } };
    if (text.includes('connect')) return { route: '/connect', tool: { type: 'navigate', route: '/connect' } };
    if (text.includes('study')) return { route: '/career-ai', tool: { type: 'navigate', route: '/career-ai' } };
    if (text.includes('feed')) return { route: '/feed', tool: { type: 'navigate', route: '/feed' } };
    if (text.includes('safety')) return { route: '/safety', tool: { type: 'navigate', route: '/safety' } };
    if (text.includes('business')) return { route: '/groups/pro', tool: { type: 'navigate', route: '/groups/pro' } };
  }

  if (/(build|create).*(cv|resume)/i.test(text)) {
    return { route: '/ai/resume', tool: { type: 'navigate', route: '/ai/resume' } };
  }

  if (/(cover letter|draft a cover letter|create cover letter)/i.test(text)) {
    return { route: '/ai/cover-letter', tool: { type: 'navigate', route: '/ai/cover-letter' } };
  }

  if (/(find jobs|job search|search jobs|open jobs)/i.test(text)) {
    return { route: '/jobs', tool: { type: 'navigate', route: '/jobs' } };
  }

  if (/(marketplace|buy|sell)/i.test(text)) {
    return { route: '/marketplace', tool: { type: 'navigate', route: '/marketplace' } };
  }

  if (/(messages|chat|dm)/i.test(text)) {
    return { route: '/messages', tool: { type: 'navigate', route: '/messages' } };
  }

  return null;
}

async function getModelReply(message, history) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (openAiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are MEXA, the FaceMeX AI operating system. Help users navigate the platform and answer clearly. Keep replies concise, practical, and action oriented.',
          },
          ...history.slice(-6).map((entry) => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: entry.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json().catch(() => ({}));
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      return { reply, provider: 'openai' };
    }
  }

  if (deepseekKey) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are MEXA, the FaceMeX AI operating system. Give helpful, short, and actionable responses.',
          },
          ...history.slice(-6).map((entry) => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: entry.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json().catch(() => ({}));
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      return { reply, provider: 'deepseek' };
    }
  }

  return {
    reply: `I can help you navigate FaceMeX. I routed your request locally because no AI provider is configured right now. If you want, I can open the relevant workspace for you immediately.`,
    provider: 'router',
  };
}

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

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const body = parseBody(event);
  const message = normalizeMessage(body.message);

  if (!message) {
    return json(400, { error: 'message_required' });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const routeAction = resolveRoute(message);

  if (routeAction) {
    return json(200, {
      ok: true,
      reply: `Opening ${routeAction.route.replace('/', '') || 'the requested workspace'}.`,
      tool: routeAction.tool,
      route: routeAction.route,
      provider: 'router',
    });
  }

  try {
    const aiResult = await getModelReply(message, history);
    return json(200, {
      ok: true,
      reply: aiResult.reply,
      provider: aiResult.provider,
      confidence: 0.86,
    });
  } catch (error) {
    return json(200, {
      ok: true,
      reply: 'I am ready to assist. I hit a temporary issue reaching the AI service, so I switched to a local workflow for now.',
      provider: 'router',
      confidence: 0.6,
    });
  }
};

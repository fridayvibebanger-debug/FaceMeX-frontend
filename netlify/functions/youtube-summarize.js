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

async function summarizeYouTubeVideo({ videoId, title, channelTitle, watchUrl, description }) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    throw new Error('missing_openai_api_key');
  }

  const prompt = `You are a YouTube lesson summarization assistant.

Summarize this video using only the details provided below. If the transcript is not available, be honest and summarize based on the title, channel, link, and description metadata.

Title: ${title}
Channel: ${channelTitle || 'YouTube'}
Link: ${watchUrl}
Description: ${description || 'No description provided.'}

Provide:
- main idea
- key points
- step-by-step explanation
- action steps
- quick revision notes

Keep the answer clear, direct, and useful for learning from the video.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes YouTube lesson videos.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error?.message || data?.error || 'openai_request_failed';
    throw new Error(String(error));
  }

  return String(data?.choices?.[0]?.message?.content || '').trim();
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
  const videoId = String(body.videoId || '').trim();
  const title = String(body.title || '').trim();
  const watchUrl = String(body.watchUrl || '').trim();
  const channelTitle = String(body.channelTitle || '').trim();
  const description = String(body.description || '').trim();

  if (!videoId || !title || !watchUrl) {
    return json(400, { error: 'video_id_title_watch_url_required' });
  }

  try {
    const summary = await summarizeYouTubeVideo({ videoId, title, channelTitle, watchUrl, description });
    return json(200, { ok: true, summary });
  } catch (error) {
    console.error('YouTube summarize failed:', error);
    return json(500, { error: String(error?.message || error || 'youtube_summary_failed') });
  }
};

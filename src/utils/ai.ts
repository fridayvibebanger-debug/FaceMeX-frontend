import { API_URL } from '@/lib/api';

export async function chatWithAI(message: string) {
  const res = await fetch(`${API_URL}/api/ai/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      task: 'general_chat',
    }),
  });

  const data = await res.json().catch(() => ({ success: false }));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'AI reply failed');
  }

  return data;
}

export async function twinAIReply(message: string, style: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/ai/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      task: style || 'general_chat',
    }),
  });

  const data = await res.json().catch(() => ({ success: false }));
  if (!res.ok || !data?.success) throw new Error(data?.error || 'AI reply failed');
  return String(data.response || data.content || data.text || '');
}

export async function deepseekReply(prompt: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/ai/deepseek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      task: 'deepseek_chat',
    })
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || data?.error || data?.ok === false) throw new Error(data?.error || 'deepseek_failed');
  const text = data.text || data.response || data.content || '';
  return String(text);
}

/**
 * FaceMeX AI Reply Utility
 *
 * Supports:
 * - Text-only replies
 * - Image + text replies
 *
 * The frontend sends the image to the FaceMeX backend.
 * API keys remain on the backend.
 */

import { api } from './api';

interface AIReplyImage {
  data: string;       // data:image/jpeg;base64,...
  mimeType?: string;
}

interface AIReplyOptions {
  context: Array<{
    sender: string;
    content: string;
  }>;

  userMessage: string;

  tone?: 'professional' | 'casual' | 'friendly';

  maxLength?: number;

  image?: AIReplyImage | null;
}

export async function generateAIReply(
  options: AIReplyOptions
): Promise<string> {
  const {
    context,
    userMessage,
    tone = 'casual',
    maxLength = 150,
    image = null,
  } = options;

  const contextMessages = context
    .slice(-5)
    .map((msg) => `${msg.sender}: ${msg.content}`)
    .join('\n');

  const toneInstructions = {
    professional:
      'Write in a professional, polite tone suitable for business communication.',

    casual:
      'Write in a casual, natural and friendly tone.',

    friendly:
      'Write in a warm, friendly and approachable tone.',
  };

  const prompt = `
You are FaceMeX AI Reply Assistant.

Recent conversation:
${contextMessages || '(No previous messages)'}

Latest user message:
"${userMessage}"

${image ? `
IMPORTANT:
The user attached an image.

You MUST analyze the image before answering.

Do not claim that no image was attached.
Do not say that you cannot see the image unless the image data is actually invalid.
` : ''}

${toneInstructions[tone]}

Rules:
- Write ONLY the reply.
- Do not mention that you are an AI.
- Be natural and human.
- Keep the response concise.
- Maximum ${maxLength} characters.
`;

  try {
    const data = await api.post('/api/ai/reply', {
      prompt,
      message: userMessage,
      context,
      type: image ? 'vision-reply' : 'reply',
      maxLength,

      // THIS IS THE IMPORTANT PART
      image: image
        ? {
            data: image.data,
            mimeType: image.mimeType || 'image/jpeg',
          }
        : null,
    });

    const reply = String(
      data?.text ??
      data?.reply ??
      data?.content ??
      data?.message ??
      ''
    ).trim();

    if (!reply) {
      throw new Error('The AI service returned an empty reply.');
    }

    const cleanedReply = reply
      .replace(/^["']|["']$/g, '')
      .replace(/^Reply:\s*/i, '')
      .trim();

    if (cleanedReply.length <= maxLength) {
      return cleanedReply;
    }

    return (
      cleanedReply
        .substring(0, Math.max(0, maxLength - 3))
        .trimEnd() + '...'
    );

  } catch (error) {
    console.error(
      'FaceMeX AI reply generation failed:',
      error
    );

    let details = 'Please try again.';

    if (error instanceof Error && error.message) {
      try {
        const parsed = JSON.parse(error.message);

        details =
          parsed?.error ||
          parsed?.message ||
          parsed?.details ||
          error.message;
      } catch {
        details = error.message;
      }
    }

    throw new Error(
      `Failed to generate AI reply. ${details}`
    );
  }
}

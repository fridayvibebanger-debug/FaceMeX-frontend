/**
 * AI Reply utility using DeepSeek API
 * Only available for Creator+ or higher tiers
 */

 import { api } from './api';

interface AIReplyOptions {
  context: Array<{ sender: string; content: string }>; // Recent messages in conversation
  userMessage: string;
  tone?: 'professional' | 'casual' | 'friendly';
  maxLength?: number;
}

export async function generateAIReply(options: AIReplyOptions): Promise<string> {
  const { context, userMessage, tone = 'casual', maxLength = 150 } = options;

  // Build conversation context
  const contextMessages = context
    .slice(-3) // Last 3 messages for context
    .map(msg => `${msg.sender}: ${msg.content}`)
    .join('\n');

  const toneInstructions = {
    professional: 'Write in a professional, polite tone suitable for business communication.',
    casual: 'Write in a casual, friendly tone.',
    friendly: 'Write in a warm, friendly tone.'
  };

  const prompt = `You are an AI assistant helping to draft a reply in a messaging conversation. 

Recent conversation:
${contextMessages}

The last message you received was: "${userMessage}"

${toneInstructions[tone]}

Draft a brief, natural reply (max ${maxLength} characters). Be helpful but not overly formal. Don't ask questions unless it makes sense. Don't mention you're an AI.`;

  try {
    const data = await api.post('/api/ai/deepseek', { prompt });
    const reply = (data?.text || '').toString().trim();
    
    if (!reply) {
      throw new Error('No reply generated');
    }

    // Ensure reply doesn't exceed max length
    return reply.length > maxLength ? reply.substring(0, maxLength - 3) + '...' : reply;
  } catch (error) {
    console.error('AI reply generation failed:', error);
    let details = 'Please try again.';
    if (error instanceof Error && error.message) {
      try {
        const parsed = JSON.parse(error.message);
        details = parsed?.error || parsed?.message || error.message;
      } catch {
        details = error.message;
      }
    }
    throw new Error(`Failed to generate AI reply. ${details}`);
  }
}

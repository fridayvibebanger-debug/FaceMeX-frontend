const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARACTERS = 30000;

export function buildWorkspaceConversationMessages(history, latestPrompt, systemInstruction) {
  const previousMessages = Array.isArray(history)
    ? history
      .filter((message) =>
        message &&
        !message.deletedFromChat &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim()
      )
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(({ role, content }) => ({ role, content: content.trim() }))
    : [];

  let remainingCharacters = MAX_CONTEXT_CHARACTERS;
  const recentMessages = [];

  for (let index = previousMessages.length - 1; index >= 0; index -= 1) {
    const message = previousMessages[index];
    if (message.content.length > remainingCharacters) break;
    recentMessages.unshift(message);
    remainingCharacters -= message.content.length;
  }

  return [
    ...(systemInstruction?.trim()
      ? [{ role: 'system', content: systemInstruction.trim() }]
      : []),
    ...recentMessages,
    { role: 'user', content: String(latestPrompt || '').trim() },
  ];
}

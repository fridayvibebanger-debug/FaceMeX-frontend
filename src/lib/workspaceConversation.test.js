import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceConversationMessages } from './workspaceConversation.js';

test('preserves active conversation order, system guidance, and the latest prompt', () => {
  const messages = buildWorkspaceConversationMessages(
    [
      { role: 'user', content: 'Help me prepare for an interview.' },
      { role: 'assistant', content: 'What role are you applying for?' },
      { role: 'user', content: 'A cashier position.' },
    ],
    'Yes, give me practice questions.',
    'Use the conversation to understand follow-ups.',
  );

  assert.deepEqual(messages, [
    { role: 'system', content: 'Use the conversation to understand follow-ups.' },
    { role: 'user', content: 'Help me prepare for an interview.' },
    { role: 'assistant', content: 'What role are you applying for?' },
    { role: 'user', content: 'A cashier position.' },
    { role: 'user', content: 'Yes, give me practice questions.' },
  ]);
});

test('omits deleted and invalid history and bounds the retained context', () => {
  const history = [
    { role: 'user', content: 'Deleted details.', deletedFromChat: true },
    { role: 'system', content: 'Unexpected history role.' },
    { role: 'user', content: 'x'.repeat(30001) },
    { role: 'assistant', content: 'Recent answer.' },
  ];

  assert.deepEqual(
    buildWorkspaceConversationMessages(history, 'Continue.', 'Assistant rules.'),
    [
      { role: 'system', content: 'Assistant rules.' },
      { role: 'assistant', content: 'Recent answer.' },
      { role: 'user', content: 'Continue.' },
    ],
  );
});

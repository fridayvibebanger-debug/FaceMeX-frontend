import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toSameOriginAIProxyPath } from './aiProxyPath.js';

test('production AI routes use the direct Netlify function path', () => {
  assert.equal(
    toSameOriginAIProxyPath('/api/ai/reply', true),
    '/.netlify/functions/ai-proxy/reply',
  );
  assert.equal(
    toSameOriginAIProxyPath('/api/ai/pro/job-assistant', true),
    '/.netlify/functions/ai-proxy/pro/job-assistant',
  );
});

test('non-production and non-AI routes keep their original path', () => {
  assert.equal(toSameOriginAIProxyPath('/api/ai/reply', false), '/api/ai/reply');
  assert.equal(toSameOriginAIProxyPath('/api/users/me', true), '/api/users/me');
});

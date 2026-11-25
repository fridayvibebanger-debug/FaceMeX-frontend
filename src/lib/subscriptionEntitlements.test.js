import test from 'node:test';
import assert from 'node:assert/strict';
import { isTierAtLeast, resolveSubscriptionTier } from './subscriptionEntitlements.js';

test('keeps a lifetime Pro profile active when its expiry is null', () => {
  assert.equal(resolveSubscriptionTier({
    tier: 'pro',
    is_pro: true,
    is_active: true,
    subscription_status: 'lifetime',
    subscription_plan: 'pro',
    membership: 'pro',
    subscription_tier: 'exclusive',
    subscription_expires_at: null,
  }), 'pro');
});

test('uses active subscription fields when the canonical tier is stale Free', () => {
  assert.equal(resolveSubscriptionTier({
    tier: 'free',
    is_pro: true,
    is_active: true,
    subscription_status: 'active',
    subscription_plan: 'pro',
    subscription_expires_at: null,
  }), 'pro');
});

test('does not preserve Pro after an explicit expired subscription', () => {
  assert.equal(resolveSubscriptionTier({
    tier: 'pro',
    is_pro: true,
    is_active: true,
    subscription_status: 'expired',
    subscription_plan: 'pro',
    subscription_expires_at: '2020-01-01T00:00:00.000Z',
  }, 'free'), 'free');
});

test('keeps tier hierarchy consistent for frontend and server checks', () => {
  assert.equal(isTierAtLeast('pro', 'pro'), true);
  assert.equal(isTierAtLeast('business', 'pro'), true);
  assert.equal(isTierAtLeast('plus', 'pro'), false);
});

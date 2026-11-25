const TIER_ORDER = {
  free: 0,
  plus: 1,
  pro: 2,
  creator: 3,
  business: 4,
  exclusive: 5,
};

function normalizeTier(value) {
  const tier = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TIER_ORDER, tier) ? tier : '';
}

function isExpired(expiration, now) {
  if (expiration == null || expiration === '') return false;
  const timestamp = Date.parse(String(expiration));
  return !Number.isFinite(timestamp) || timestamp <= now;
}

function lowerTierFromProfile(profile, fallbackTier) {
  const candidates = [
    profile?.membership,
    profile?.subscription_plan,
    fallbackTier,
  ].map(normalizeTier).filter(Boolean);

  const lowerTiers = candidates.filter((tier) => TIER_ORDER[tier] < TIER_ORDER.pro);
  return lowerTiers.sort((a, b) => TIER_ORDER[b] - TIER_ORDER[a])[0] || 'free';
}

export function resolveSubscriptionTier(profile, fallbackTier = 'free', now = Date.now()) {
  const storedTier = normalizeTier(profile?.tier);
  const fallback = normalizeTier(fallbackTier) || 'free';
  const status = String(profile?.subscription_status || '').trim().toLowerCase();
  const expiresAt = profile?.subscription_expires_at;
  const expiryPassed = isExpired(expiresAt, now);
  const lifetimeWithoutExpiry = status === 'lifetime' && (expiresAt == null || expiresAt === '');
  const terminalStatus = ['canceled', 'cancelled', 'expired', 'inactive', 'past_due'].includes(status);
  const activeStatus = status === 'active' || status === 'trialing' || lifetimeWithoutExpiry;
  const activeProFlag =
    profile?.is_pro === true &&
    profile?.is_active === true &&
    (status === '' || status === 'active' || status === 'trialing' || lifetimeWithoutExpiry);

  if (
    (expiryPassed || terminalStatus || profile?.is_active === false) &&
    (storedTier === 'pro' || profile?.is_pro === true || normalizeTier(profile?.subscription_plan) === 'pro')
  ) {
    return lowerTierFromProfile(profile, fallback);
  }

  if (activeStatus && !expiryPassed && profile?.is_active !== false) {
    if (storedTier && storedTier !== 'free') return storedTier;

    const activePlan = normalizeTier(profile?.subscription_plan);
    if (activePlan && activePlan !== 'free') return activePlan;

    const membership = normalizeTier(profile?.membership);
    if (membership && membership !== 'free') return membership;

    if (profile?.is_pro === true) return 'pro';
  }

  if (activeProFlag && !expiryPassed) return 'pro';
  return storedTier || fallback;
}

export function isTierAtLeast(tier, minimumTier) {
  const current = normalizeTier(tier) || 'free';
  const minimum = normalizeTier(minimumTier) || 'free';
  return TIER_ORDER[current] >= TIER_ORDER[minimum];
}


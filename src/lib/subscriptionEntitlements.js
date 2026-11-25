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
  const revokedTier = Math.max(
    TIER_ORDER[normalizeTier(profile?.tier)] || 0,
    TIER_ORDER[normalizeTier(profile?.subscription_plan)] || 0,
    profile?.is_pro === true ? TIER_ORDER.pro : 0
  );
  const candidates = [
    profile?.tier,
    profile?.membership,
    fallbackTier,
  ].map(normalizeTier).filter(Boolean);

  const lowerTiers = candidates.filter((tier) => TIER_ORDER[tier] < revokedTier);
  return lowerTiers.sort((a, b) => TIER_ORDER[b] - TIER_ORDER[a])[0] || 'free';
}

export function resolveSubscriptionTier(profile, fallbackTier = 'free', now = Date.now()) {
  const storedTier = normalizeTier(profile?.tier);
  const fallback = normalizeTier(fallbackTier) || 'free';
  const status = String(profile?.subscription_status || '').trim().toLowerCase();
  const expiresAt = profile?.subscription_expires_at;
  const expiryPassed = isExpired(expiresAt, now);
  const lifetimeWithoutExpiry = status === 'lifetime' && (expiresAt == null || expiresAt === '');
  const terminalStatus = ['expired', 'inactive'].includes(status) ||
    (status === 'past_due' && (expiresAt == null || expiresAt === '' || expiryPassed)) ||
    (['canceled', 'cancelled'].includes(status) && (expiresAt == null || expiresAt === '' || expiryPassed));
  const activeStatus = status === 'active' || status === 'trialing' ||
    (status === 'lifetime' && !expiryPassed);
  const activeProFlag =
    profile?.is_pro === true &&
    profile?.is_active === true &&
    (status === '' || status === 'active' || status === 'trialing' ||
      (status === 'lifetime' && !expiryPassed));

  if (expiryPassed || terminalStatus || profile?.is_active === false) {
    return lowerTierFromProfile(profile, fallback);
  }

  if (activeStatus && !expiryPassed && profile?.is_active !== false) {
    const activePlan = normalizeTier(profile?.subscription_plan);
    const membership = normalizeTier(profile?.membership);
    const activeTiers = [
      storedTier,
      activePlan,
      membership,
      profile?.is_pro === true ? 'pro' : '',
    ].map(normalizeTier).filter(Boolean);
    return activeTiers.sort((a, b) => TIER_ORDER[b] - TIER_ORDER[a])[0] || 'free';
  }

  if (activeProFlag && !expiryPassed) return 'pro';
  return storedTier || fallback;
}

export function isTierAtLeast(tier, minimumTier) {
  const current = normalizeTier(tier) || 'free';
  const minimum = normalizeTier(minimumTier) || 'free';
  return TIER_ORDER[current] >= TIER_ORDER[minimum];
}


import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

type Tier = 'free' | 'pro' | 'creator' | 'business' | 'exclusive' | 'verified';

function normalizeTier(value: unknown): Tier {
  const tier = String(value || '').toLowerCase().trim();

  if (
    tier === 'pro' ||
    tier === 'creator' ||
    tier === 'business' ||
    tier === 'exclusive' ||
    tier === 'verified'
  ) {
    return tier;
  }

  return 'free';
}

function getBestTier(profile: any): Tier {
  return normalizeTier(
    profile?.subscription_tier ||
      profile?.tier ||
      profile?.plan ||
      profile?.account_tier ||
      'free'
  );
}

async function findProfile(authUser: any) {
  if (!authUser?.id) return null;

  const byId = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (byId.data) return byId.data;

  const byUserId = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (byUserId.data) return byUserId.data;

  if (authUser.email) {
    const byEmail = await supabase
      .from('profiles')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    if (byEmail.data) return byEmail.data;
  }

  return null;
}

export default function TierSync() {
  useEffect(() => {
    let cancelled = false;

    async function syncTier() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log('FaceMeX auth tier sync error:', authError.message);
        return;
      }

      const authUser = authData.user;

      if (!authUser?.id) {
        console.log('FaceMeX tier sync: no logged-in user');
        return;
      }

      const profile = await findProfile(authUser);

      if (cancelled) return;

      if (!profile) {
        console.log('FaceMeX tier sync: no profile found for', authUser.email);
        return;
      }

      const syncedTier = getBestTier(profile);

      localStorage.setItem('facemex_current_tier', syncedTier);
      localStorage.setItem('facemex_user_tier', syncedTier);

      const syncedUser = {
        id: authUser.id,
        email: profile.email || authUser.email,
        name:
          profile.name ||
          profile.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          'FaceMeX User',
        full_name:
          profile.full_name ||
          profile.name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0],
        avatar:
          profile.avatar ||
          profile.avatar_url ||
          profile.profile_picture ||
          authUser.user_metadata?.avatar_url ||
          '',
        tier: syncedTier,
        subscription_tier: syncedTier,
        subscription_status: profile.subscription_status || 'active',
      };

      useAuthStore.setState((state: any) => ({
        ...state,
        user: {
          ...(state.user || {}),
          ...syncedUser,
        },
        currentTier: syncedTier,
        tier: syncedTier,
      }));

      useUserStore.setState((state: any) => ({
        ...state,
        tier: syncedTier,
        currentTier: syncedTier,
        profile: {
          ...(state.profile || {}),
          ...profile,
          tier: syncedTier,
          subscription_tier: syncedTier,
        },
        user: {
          ...(state.user || {}),
          ...syncedUser,
        },
      }));

      useSubscriptionStore.setState({
        currentTier: syncedTier,
        trialTier: null,
        trialEndsAt: null,
      });

      window.dispatchEvent(
        new CustomEvent('facemex-tier-synced', {
          detail: {
            tier: syncedTier,
            profile,
          },
        })
      );

      console.log('FaceMeX tier synced:', syncedTier);
    }

    syncTier();

    const { data } = supabase.auth.onAuthStateChange(() => {
      syncTier();
    });

    const timer = window.setInterval(() => {
      syncTier();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

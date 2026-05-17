import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/userStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

type Tier = 'free' | 'pro' | 'creator' | 'business' | 'exclusive' | 'verified';

function normalizeTier(value: unknown): Tier {
  const tier = String(value || '').toLowerCase();

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

export default function TierSync() {
  useEffect(() => {
    let cancelled = false;

    async function syncTier() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (!authUser?.id) return;

      let profile: any = null;

      const byId = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (byId.data) {
        profile = byId.data;
      }

      if (!profile) {
        const byUserId = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (byUserId.data) {
          profile = byUserId.data;
        }
      }

      if (!profile && authUser.email) {
        const byEmail = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        if (byEmail.data) {
          profile = byEmail.data;
        }
      }

      if (cancelled || !profile) return;

      const tier = normalizeTier(
        profile.subscription_tier || profile.tier || profile.plan || 'free'
      );

      localStorage.setItem('facemex_current_tier', tier);
      localStorage.setItem('facemex_user_tier', tier);

      const userStore: any = useUserStore as any;

      if (userStore?.setState) {
        userStore.setState((state: any) => ({
          tier,
          currentTier: tier,
          profile: {
            ...(state.profile || {}),
            ...profile,
            tier,
            subscription_tier: tier,
          },
          user: state.user
            ? {
                ...state.user,
                name:
                  profile.name ||
                  profile.full_name ||
                  state.user.name ||
                  authUser.email?.split('@')[0],
                full_name: profile.full_name || profile.name || state.user.full_name,
                email: profile.email || authUser.email || state.user.email,
                avatar:
                  profile.avatar ||
                  profile.avatar_url ||
                  profile.profile_picture ||
                  state.user.avatar,
                tier,
                subscription_tier: tier,
                subscription_status:
                  profile.subscription_status || state.user.subscription_status,
              }
            : {
                id: authUser.id,
                email: authUser.email,
                name: profile.name || profile.full_name || authUser.email?.split('@')[0],
                full_name: profile.full_name || profile.name,
                avatar: profile.avatar || profile.avatar_url || profile.profile_picture,
                tier,
                subscription_tier: tier,
                subscription_status: profile.subscription_status,
              },
        }));
      }

      const subscriptionStore: any = useSubscriptionStore as any;

      if (subscriptionStore?.setState) {
        subscriptionStore.setState({
          currentTier: tier,
          trialTier: null,
          trialEndsAt: null,
        });
      }

      window.dispatchEvent(
        new CustomEvent('facemex-tier-synced', {
          detail: { tier, profile },
        })
      );

      console.log('FaceMeX tier synced:', tier);
    }

    syncTier();

    const { data } = supabase.auth.onAuthStateChange(() => {
      syncTier();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

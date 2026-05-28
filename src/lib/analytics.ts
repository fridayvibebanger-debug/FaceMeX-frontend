import { supabase } from '@/lib/supabaseClient';

type AnalyticsMetadata = Record<string, any>;

export async function trackEvent(
  eventName: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id) return;

    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: eventName,
      page: page || window.location.pathname,
      metadata,
    });

    await supabase
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
}

export async function trackAppOpen() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id) return;

    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: 'app_open',
      page: window.location.pathname,
      metadata: {
        userAgent: navigator.userAgent,
        referrer: document.referrer || '',
      },
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_seen_at,total_sessions')
      .eq('id', user.id)
      .maybeSingle();

    await supabase
      .from('profiles')
      .update({
        first_seen_at: profile?.first_seen_at || new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        total_sessions: Number(profile?.total_sessions || 0) + 1,
      })
      .eq('id', user.id);
  } catch (error) {
    console.warn('App open tracking failed:', error);
  }
}

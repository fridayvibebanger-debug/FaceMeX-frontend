import { supabase } from '@/lib/supabase';

type TrackAction =
  | 'view'
  | 'like'
  | 'comment'
  | 'save'
  | 'share'
  | 'follow'
  | 'message'
  | 'contact_seller'
  | 'buy_click';

const actionWeights: Record<TrackAction, number> = {
  view: 1,
  like: 3,
  comment: 5,
  save: 7,
  share: 8,
  follow: 10,
  message: 12,
  contact_seller: 15,
  buy_click: 15,
};

export async function trackInterest(input: {
  userId: string;
  action: TrackAction;
  category?: string;
  tag?: string;
  postId?: string;
  shopId?: string;
  itemId?: string;
}) {
  if (!input.userId) return;

  const interest = input.category || input.tag;

  if (!interest) return;

  const weight = actionWeights[input.action] || 1;

  await supabase.from('user_interactions').insert({
    user_id: input.userId,
    post_id: input.postId || null,
    shop_id: input.shopId || null,
    item_id: input.itemId || null,
    action: input.action,
    category: input.category || null,
    tag: input.tag || null,
    weight,
  });

  const { data: current } = await supabase
    .from('user_interests')
    .select('score')
    .eq('user_id', input.userId)
    .eq('interest', interest)
    .maybeSingle();

  const nextScore = Number(current?.score || 0) + weight;

  await supabase.from('user_interests').upsert(
    {
      user_id: input.userId,
      interest,
      score: nextScore,
      last_updated: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,interest',
    }
  );
}

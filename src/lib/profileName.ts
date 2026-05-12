export function getRealName(profile: any, fallbackId?: string) {
  return (
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.split('@')[0] ||
    `User ${String(fallbackId || '').slice(0, 6)}`
  );
}

export function getRealAvatar(profile: any) {
  return profile?.avatar_url || profile?.avatar || '';
}

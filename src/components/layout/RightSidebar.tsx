import { useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, Users, ExternalLink, Circle } from 'lucide-react';
import { useFriendStore } from '@/store/friendStore';
import { useUserStore } from '@/store/userStore';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

type ActiveUser = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  headline?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  tier?: string | null;
  is_active?: boolean | null;
  last_seen?: string | null;
};

export default function RightSidebar() {
  const navigate = useNavigate();

  const {
    id: storeUserId,
    name: storeUserName,
  } = useUserStore();

  const {
    outgoing,
    initRealtime,
    loadRequests,
    sendRequest,
  } = useFriendStore();

  const [authUserId, setAuthUserId] = useState('');
  const [authUserName, setAuthUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const currentUserId = storeUserId || authUserId;
  const currentUserName = storeUserName || authUserName || 'FaceMeX User';

  useEffect(() => {
    let mounted = true;

    async function loadAuthUser() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!mounted || !user) return;

      setAuthUserId(user.id);
      setAuthUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'FaceMeX User'
      );
    }

    loadAuthUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    initRealtime(currentUserId);
    loadRequests().catch(() => {});
  }, [initRealtime, loadRequests, currentUserId]);

  const getDisplayName = (user: ActiveUser) => {
    return (
      user.full_name ||
      user.name ||
      user.username ||
      user.email?.split('@')[0] ||
      'FaceMeX Member'
    );
  };

  const getDisplayBio = (user: ActiveUser) => {
    return (
      user.headline ||
      user.bio ||
      user.location ||
      'Active on FaceMeX'
    );
  };

  const getAvatar = (user: ActiveUser) => {
    return user.avatar_url || user.avatar || '';
  };

  const getInitials = (name: string) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const isAlreadyRequested = (targetUserId: string) => {
    return outgoing.some(
      (request) =>
        request.toUserId === targetUserId &&
        request.status === 'pending'
    );
  };

  const loadActiveUsers = async () => {
    if (!currentUserId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, name, username, email, bio, headline, avatar_url, avatar, location, tier, is_active, last_seen'
        )
        .neq('id', currentUserId)
        .eq('is_active', true)
        .order('last_seen', { ascending: false, nullsFirst: false })
        .limit(12);

      if (error) {
        console.error('Failed to load active users:', error);
        setActiveUsers([]);
        return;
      }

      setActiveUsers((data || []) as ActiveUser[]);
    } catch (error) {
      console.error('Failed to load active users:', error);
      setActiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    loadActiveUsers();

    const channel = supabase
      .channel(`right-sidebar-active-users-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadActiveUsers();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      loadActiveUsers();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [currentUserId]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return activeUsers;

    return activeUsers.filter((user) => {
      const name = getDisplayName(user).toLowerCase();
      const bio = getDisplayBio(user).toLowerCase();

      return name.includes(q) || bio.includes(q);
    });
  }, [searchQuery, activeUsers]);

  const handleConnect = async (targetUser: ActiveUser) => {
    if (!currentUserId || !targetUser.id) return;

    try {
      setSendingId(targetUser.id);

      await sendRequest(
        {
          id: currentUserId,
          name: currentUserName,
        },
        {
          id: targetUser.id,
          name: getDisplayName(targetUser),
        }
      );
    } finally {
      setSendingId(null);
    }
  };

  return (
    <aside className="hidden xl:block fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl px-3 py-4 overflow-y-auto">
      <div className="space-y-3">
        <Card className="border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Connect
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active people you can connect with now.
                </p>
              </div>

              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active users..."
                className="h-9 rounded-full pl-9 text-xs"
              />
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Loading active users...
                </p>
              </div>
            ) : filteredUsers.length ? (
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const name = getDisplayName(user);
                  const bio = getDisplayBio(user);
                  const pending = isAlreadyRequested(user.id);
                  const sending = sendingId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getAvatar(user)} alt={name} />
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                          </Avatar>

                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                              {name}
                            </p>
                            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500 shrink-0" />
                          </div>

                          <p className="text-xs text-muted-foreground truncate">
                            {bio}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full text-xs"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full text-xs"
                          disabled={pending || sending}
                          onClick={() => handleConnect(user)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          {sending ? 'Sending' : pending ? 'Pending' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-5 text-center">
                <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium text-slate-900 dark:text-slate-50">
                  No active users right now
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When real users are active, they will show here.
                </p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full text-xs"
              onClick={() => navigate('/connect')}
            >
              Open Connect Page
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

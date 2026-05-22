import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, Users, ExternalLink } from 'lucide-react';
import { useFriendStore } from '@/store/friendStore';
import { useUserStore } from '@/store/userStore';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

type SuggestedUser = {
  id: string;
  name?: string;
  full_name?: string;
  username?: string;
  bio?: string;
  headline?: string;
  avatar?: string;
  avatar_url?: string;
  location?: string;
  tier?: string;
};

export default function RightSidebar() {
  const navigate = useNavigate();
  const { id: userId, name: userName } = useUserStore();

  const {
    outgoing,
    initRealtime,
    loadRequests,
    sendRequest,
  } = useFriendStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    initRealtime(userId);
    loadRequests().catch(() => {});
  }, [initRealtime, loadRequests, userId]);

  useEffect(() => {
    let mounted = true;

    async function loadSuggestedUsers() {
      try {
        if (!API_URL) return;

        setLoading(true);

        const res = await fetch(`${API_URL}/api/users/suggested`, {
          credentials: 'include',
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!mounted) return;

        const users = Array.isArray(data?.users) ? data.users : [];

        setSuggestedUsers(
          users
            .filter((user: SuggestedUser) => user?.id && user.id !== userId)
            .slice(0, 8)
        );
      } catch {
        if (mounted) setSuggestedUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSuggestedUsers();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const getDisplayName = (user: SuggestedUser) => {
    return (
      user.full_name ||
      user.name ||
      user.username ||
      'FaceMeX Member'
    );
  };

  const getDisplayBio = (user: SuggestedUser) => {
    return (
      user.headline ||
      user.bio ||
      user.location ||
      'Connect on FaceMeX'
    );
  };

  const getAvatar = (user: SuggestedUser) => {
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

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return suggestedUsers;

    return suggestedUsers.filter((user) => {
      const name = getDisplayName(user).toLowerCase();
      const bio = getDisplayBio(user).toLowerCase();

      return name.includes(q) || bio.includes(q);
    });
  }, [searchQuery, suggestedUsers]);

  const handleConnect = async (targetUser: SuggestedUser) => {
    if (!userId || !targetUser.id) return;

    try {
      setSendingId(targetUser.id);

      await sendRequest(
        {
          id: userId,
          name: userName || 'FaceMeX User',
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
                  Discover people, creators, professionals, and businesses.
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
                placeholder="Search people..."
                className="h-9 rounded-full pl-9 text-xs"
              />
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Loading people...
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
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getAvatar(user)} alt={name} />
                          <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                            {name}
                          </p>
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
                  No new people right now
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When more users join FaceMeX, they will show here.
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

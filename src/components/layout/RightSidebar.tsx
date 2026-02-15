import { useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, UserPlus, X } from 'lucide-react';
import { useFriendStore } from '@/store/friendStore';
import { useUserStore } from '@/store/userStore';

export default function RightSidebar() {
  const { id: userId, name: userName } = useUserStore();
  const { incoming, outgoing, initRealtime, loadRequests, sendRequest, acceptRequest, declineRequest } = useFriendStore();

  useEffect(() => {
    initRealtime(userId);
    loadRequests().catch(() => {});
  }, [initRealtime, loadRequests, userId]);

  const suggestedUsers = useMemo(
    () => [
      { id: '2', name: 'Sarah Johnson', bio: 'Designer & Creator' },
      { id: '3', name: 'Mike Chen', bio: 'Photographer' },
      { id: '4', name: 'Emma Wilson', bio: 'Developer' },
    ],
    []
  );

  const getInitials = (name: string) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const isAlreadyRequested = (targetUserId: string) => outgoing.some((r) => r.toUserId === targetUserId && r.status === 'pending');

  return (
    <aside className="hidden xl:block fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl px-3 py-4 overflow-y-auto">
      <div className="space-y-3">
        <Card className="border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">Friend requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incoming.length ? (
              incoming.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(u.fromName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{u.fromName}</p>
                      <p className="text-xs text-muted-foreground truncate">Wants to connect</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" className="h-8 px-3 rounded-full text-xs" onClick={() => acceptRequest(u.id).catch(() => {})}>
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-xs" onClick={() => declineRequest(u.id).catch(() => {})}>
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No requests right now</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">Suggested for you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 px-3 text-xs flex-shrink-0"
                  disabled={isAlreadyRequested(user.id)}
                  onClick={() => sendRequest({ id: userId, name: userName }, { id: user.id, name: user.name }).catch(() => {})}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {isAlreadyRequested(user.id) ? 'Requested' : 'Add'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

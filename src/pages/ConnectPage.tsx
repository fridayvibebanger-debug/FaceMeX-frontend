import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { neonButton } from '@/styles';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type Profile = {
  id: string;
  email: string | null;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  bio?: string | null;
  is_active?: boolean;
  created_at?: string;
};

export default function ConnectPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized, restoreSession } = useAuthStore();

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  async function fetchUsers() {
    if (!isAuthenticated || !user?.id) {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    setErrorText(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, name, username, avatar_url, avatar, bio, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorText(error.message);
      setRealUsers([]);
      setLoadingUsers(false);
      return;
    }

    setRealUsers((data || []).filter((u: Profile) => u.id !== user.id));
    setLoadingUsers(false);
  }

  async function fetchFollowing() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (error) {
      console.log('Fetch following error:', error.message);
      return;
    }

    const next: Record<string, boolean> = {};

    (data || []).forEach((row: any) => {
      if (row.following_id) {
        next[row.following_id] = true;
      }
    });

    setFollowed(next);
  }

  async function fetchConnections() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.log('Fetch connections error:', error.message);
      return;
    }

    const nextConnected: Record<string, boolean> = {};
    const nextPending: Record<string, boolean> = {};

    (data || []).forEach((row: any) => {
      const otherId = row.sender_id === user.id ? row.receiver_id : row.sender_id;

      if (!otherId) return;

      if (row.status === 'accepted') {
        nextConnected[otherId] = true;
      }

      if (row.status === 'pending') {
        nextPending[otherId] = true;
      }
    });

    setConnected(nextConnected);
    setPendingRequests(nextPending);
  }

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user?.id) return;

    fetchUsers();
    fetchFollowing();
    fetchConnections();

    const channel = supabase
      .channel(`connect-page-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        () => {
          fetchFollowing();
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connection_requests' },
        () => {
          fetchConnections();
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInitialized, isAuthenticated, user?.id]);

  const suggestions = useMemo(() => {
    return realUsers
      .map((u) => ({
        id: u.id,
        name:
          u.full_name ||
          u.name ||
          u.username ||
          u.email?.split('@')[0] ||
          `User ${u.id.slice(0, 6)}`,
        headline: u.bio || 'FaceMeX member',
        avatar: u.avatar_url || u.avatar || null,
      }))
      .filter((suggestion) => {
        // If user followed someone, remove them from Discover.
        if (followed[suggestion.id]) return false;

        // If connection request is pending, remove them from Discover.
        if (pendingRequests[suggestion.id]) return false;

        // If accepted, keep them visible so Message button appears.
        return true;
      });
  }, [realUsers, followed, pendingRequests]);

  const handleFollow = async (targetUserId: string) => {
    if (!user?.id || targetUserId === user.id) return;

    const isFollowing = !!followed[targetUserId];

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) {
        setErrorText(error.message);
        return;
      }

      setFollowed((prev) => ({ ...prev, [targetUserId]: false }));
      await fetchUsers();
      return;
    }

    const { error } = await supabase.from('follows').upsert(
      {
        follower_id: user.id,
        following_id: targetUserId,
      },
      {
        onConflict: 'follower_id,following_id',
      }
    );

    if (error) {
      setErrorText(error.message);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: targetUserId,
      actor_id: user.id,
      type: 'follow',
      title: 'New follower',
      message: `${user.name || user.email?.split('@')[0] || 'Someone'} followed you.`,
      action_url: `/profile/${user.id}`,
      is_read: false,
    });

    setFollowed((prev) => ({ ...prev, [targetUserId]: true }));
    await fetchFollowing();
    await fetchUsers();
  };

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user?.id || targetUserId === user.id) return;

    setErrorText(null);

    const { data, error } = await supabase
      .from('connection_requests')
      .upsert(
        {
          sender_id: user.id,
          receiver_id: targetUserId,
          status: 'pending',
        },
        {
          onConflict: 'sender_id,receiver_id',
        }
      )
      .select()
      .single();

    if (error) {
      setErrorText(error.message);
      return;
    }

    await supabase.from('notifications').upsert({
      id: data.id,
      user_id: targetUserId,
      actor_id: user.id,
      type: 'connection_request',
      title: 'New connection request',
      message: `${user.name || user.email?.split('@')[0] || 'Someone'} wants to connect with you.`,
      action_url: '/notifications',
      is_read: false,
    });

    setPendingRequests((prev) => ({ ...prev, [targetUserId]: true }));
    await fetchConnections();
    await fetchUsers();
  };

 const startChat = async (targetUserId: string) => {
  if (!user?.id || targetUserId === user.id) return;

  navigate(`/messages/${targetUserId}?focus=1`);
};

    setErrorText(null);

    const user1 = user.id < targetUserId ? user.id : targetUserId;
    const user2 = user.id < targetUserId ? targetUserId : user.id;

    const { data, error } = await supabase
      .from('conversations')
      .upsert(
        {
          user1_id: user1,
          user2_id: user2,
        },
        {
          onConflict: 'user1_id,user2_id',
        }
      )
      .select()
      .single();

    if (error) {
      setErrorText(`Could not open chat: ${error.message}`);
      return;
    }

    navigate(`/messages/${targetUserId}?conversation=${data.id}&focus=1`);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-24">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Connect</h1>
          <p className="text-sm text-muted-foreground">
            Discover real active users on FaceMeX
            {user?.name ? ` • Hi ${user.name}` : ''}
          </p>
        </div>

        {errorText && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {errorText}
          </div>
        )}

        {loadingUsers ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading users...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No active users found yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="rounded-2xl border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${suggestion.id}`)}
                      className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0"
                    >
                      {suggestion.avatar ? (
                        <img
                          src={suggestion.avatar}
                          alt={suggestion.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${suggestion.id}`)}
                        className="font-semibold truncate hover:underline block text-left"
                      >
                        {suggestion.name}
                      </button>

                      <div className="text-sm text-muted-foreground truncate">
                        {suggestion.headline}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {connected[suggestion.id] ? (
                          <Button
                            onClick={() => startChat(suggestion.id)}
                            className={neonButton}
                          >
                            Message
                          </Button>
                        ) : pendingRequests[suggestion.id] ? (
                          <Button disabled className={neonButton}>
                            Pending
                          </Button>
                        ) : (
                          <Button
                            onClick={() => sendConnectionRequest(suggestion.id)}
                            className={neonButton}
                          >
                            Connect
                          </Button>
                        )}

                        <Button
                          onClick={() => handleFollow(suggestion.id)}
                          className={neonButton}
                        >
                          {followed[suggestion.id] ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

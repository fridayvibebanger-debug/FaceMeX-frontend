import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { MessageCircle, Phone, UserPlus, Video } from 'lucide-react';

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

type Suggestion = {
  id: string;
  name: string;
  headline: string;
  avatar: string | null;
};

export default function ConnectPage() {
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    isInitialized,
    restoreSession,
  } = useAuthStore();

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Supabase profiles error:', error.message);
        setErrorText(error.message);
        setRealUsers([]);
        return;
      }

      const filtered = (data || []).filter((u) => u.id !== user.id);

      setRealUsers(filtered);
    } catch (err: any) {
      console.log('Fetch users error:', err);
      setErrorText(err?.message || 'Could not load users.');
      setRealUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchFollowing() {
    if (!user?.id) return;

    try {
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
    } catch (err) {
      console.log('Fetch following crashed:', err);
    }
  }

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user?.id) return;

    fetchUsers();
    fetchFollowing();

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => fetchUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInitialized, isAuthenticated, user?.id]);

  const suggestions: Suggestion[] = useMemo(() => {
    return realUsers.map((u) => ({
      id: u.id,
      name:
        u.full_name ||
        u.name ||
        u.username ||
        u.email?.split('@')[0] ||
        'User',
      headline: u.bio || 'FaceMeX Member',
      avatar: u.avatar_url || u.avatar || null,
    }));
  }, [realUsers]);

  const handleFollow = async (targetUserId: string) => {
    if (!user?.id) return;

    const isFollowing = !!followed[targetUserId];

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        setFollowed((prev) => ({
          ...prev,
          [targetUserId]: false,
        }));

        return;
      }

      const { error } = await supabase.from('follows').upsert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) {
        console.log('Follow error:', error.message);
        return;
      }

      setFollowed((prev) => ({
        ...prev,
        [targetUserId]: true,
      }));
    } catch (err) {
      console.log('Follow crashed:', err);
    }
  };

  const startChat = async (targetUserId: string) => {
    if (!user?.id) return;

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
      console.log('Start chat error:', error.message);
      setErrorText(error.message);
      return;
    }

    navigate(`/messages?conversation=${data.id}`);
  };

  const startCall = async (targetUserId: string, type: 'voice' | 'video') => {
    localStorage.setItem('pending_call_type', type);
    await startChat(targetUserId);
  };

  if (!isAuthenticated) {
    return null;
  }

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

        {errorText ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {errorText}
          </div>
        ) : null}

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
            {suggestions.map((s) => (
              <Card key={s.id} className="rounded-2xl border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {s.avatar ? (
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>

                      <div className="text-sm text-muted-foreground truncate">
                        {s.headline}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant={followed[s.id] ? 'default' : 'outline'}
                          onClick={() => handleFollow(s.id)}
                        >
                          {followed[s.id] ? 'Following' : 'Follow'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/profile/${s.id}`)}
                        >
                          View Profile
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startChat(s.id)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Message
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCall(s.id, 'voice')}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCall(s.id, 'video')}
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Video
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

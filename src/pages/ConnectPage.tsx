import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
};

type Suggestion = {
  id: string;
  name: string;
  headline: string;
  avatar: string | null;
};

export default function ConnectPage() {
  const { user, followUser, unfollowUser } = useAuthStore();
  const { professional } = useUserStore();

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH USERS FROM SUPABASE
  useEffect(() => {
    fetchUsers();

    // 🔄 REALTIME LISTENER
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 GET USERS
  async function fetchUsers() {
    setLoading(true);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          username,
          avatar_url,
          bio,
          is_active
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Supabase Error:', error.message);
        return;
      }

      // 🚫 REMOVE CURRENT USER
      const filtered =
        data?.filter((u) => u.id !== currentUser?.id) || [];

      setRealUsers(filtered);
    } catch (err) {
      console.log('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 CONVERT USERS TO UI
  const suggestions: Suggestion[] = useMemo(() => {
    return realUsers.map((u) => ({
      id: u.id,

      // 👤 PRIORITY:
      // full_name → username → email
      name:
        u.full_name ||
        u.username ||
        u.email?.split('@')[0] ||
        'User',

      headline:
        u.bio ||
        'FaceMeX Member',

      avatar: u.avatar_url,
    }));
  }, [realUsers]);

  // 🔥 FOLLOW SYSTEM
  const toggleFollow = async (id: string) => {
    const isFollowing = !!followed[id];

    setFollowed((prev) => ({
      ...prev,
      [id]: !isFollowing,
    }));

    try {
      if (isFollowing) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-24">

        {/* HEADER */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold">
            Connect
          </h1>

          <p className="text-sm text-muted-foreground">
            Discover real active users on FaceMeX
            {user?.name ? ` • Hi ${user.name}` : ''}
          </p>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-10 text-muted-foreground">
            Loading users...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && suggestions.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No active users found yet.
          </div>
        )}

        {/* USERS */}
        <div className="grid gap-3">

          {suggestions.map((s) => (

            <Card
              key={s.id}
              className="rounded-2xl border"
            >
              <CardContent className="p-4">

                <div className="flex items-start gap-3">

                  {/* AVATAR */}
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

                  {/* USER INFO */}
                  <div className="flex-1 min-w-0">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="font-semibold truncate">
                          {s.name}
                        </div>

                        <div className="text-sm text-muted-foreground truncate">
                          {s.headline}
                        </div>

                      </div>

                      {/* FOLLOW BUTTON */}
                      <Button
                        size="sm"
                        variant={
                          followed[s.id]
                            ? 'default'
                            : 'outline'
                        }
                        className="rounded-full"
                        onClick={() => toggleFollow(s.id)}
                      >
                        {followed[s.id]
                          ? 'Following'
                          : 'Follow'}
                      </Button>

                    </div>

                  </div>

                </div>

              </CardContent>
            </Card>

          ))}

        </div>

      </div>
    </div>
  );
}

import Navbar from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabaseClient';

type Suggestion =
  | {
      type: 'person';
      id: string;
      name: string;
      headline: string;
      tags: string[];
    };

function normalizeTag(s: string) {
  return String(s || '').trim().toLowerCase();
}

export default function ConnectPage() {
  const { user, followUser, unfollowUser } = useAuthStore();
  const { professional } = useUserStore();

  const [activeFilter, setActiveFilter] = useState<'people' | 'companies' | 'hiring'>('people');
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [realUsers, setRealUsers] = useState<any[]>([]);

  // 🧠 Your profile tags (used for future smart matching)
  const myTags = useMemo(() => {
    const skills = (professional?.skills || []).map(normalizeTag);
    const headline = normalizeTag(professional?.headline || '');
    const location = normalizeTag(professional?.location || '');
    const bio = normalizeTag(professional?.bio || '');

    return Array.from(new Set([location, headline, bio, ...skills].filter(Boolean)));
  }, [professional]);

  // 🔥 FETCH REAL USERS FROM SUPABASE
  useEffect(() => {
    fetchUsers();
  }, []);

 const suggestions: Suggestion[] = useMemo(() => {
  return realUsers.map((u) => ({
    type: 'person',
    id: u.id,

    // 👇 use full name first
    name:
      u.full_name ||
      u.username ||
      u.email?.split('@')[0] ||
      'User',

    // 👇 professional headline
    headline:
      u.bio ||
      u.headline ||
      'Member on FaceMeX',

    // 👇 skills/tags
    tags: u.skills || [],

    // 👇 extra fields
    isPro: u.is_pro || false,
    role: u.role || 'user',
  }));
}, [realUsers]);

  // 🧠 Convert real users → UI format
  const suggestions: Suggestion[] = useMemo(() => {
    return realUsers.map((u) => ({
      type: 'person',
      id: u.id,
      name: u.email?.split('@')[0] || 'User',
      headline: 'Member on platform',
      tags: [],
    }));
  }, [realUsers]);

  // 🔘 Follow system (local UI state)
  const toggleFollow = (s: Suggestion) => {
    const isFollowing = !!followed[s.id];

    setFollowed((prev) => ({
      ...prev,
      [s.id]: !isFollowing,
    }));

    try {
      if (isFollowing) unfollowUser(s.id);
      else followUser(s.id);
    } catch (err) {
      console.log(err);
    }
  };

  const filtered = useMemo(() => {
    return suggestions;
  }, [suggestions]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-24">

        {/* HEADER */}
        <div className="mb-4">
          <h1 className="text-xl font-bold">Connect</h1>
          <p className="text-xs text-muted-foreground">
            Suggested real people from the platform
            {user?.name ? ` (Hi ${user.name})` : ''}
          </p>
        </div>

        {/* USERS LIST */}
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className="rounded-2xl">
              <CardContent className="p-4">

                <div className="flex items-start gap-3">

                  {/* ICON */}
                  <div className="mt-0.5">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">

                    <div className="flex items-center justify-between gap-3">

                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.headline}
                        </div>
                      </div>

                      {/* FOLLOW BUTTON */}
                      <Button
                        size="sm"
                        variant={followed[s.id] ? 'default' : 'outline'}
                        className="rounded-full"
                        onClick={() => toggleFollow(s)}
                      >
                        {followed[s.id] ? 'Following' : 'Follow'}
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

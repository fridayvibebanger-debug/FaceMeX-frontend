import Navbar from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';

type Suggestion =
  | {
      type: 'person';
      id: string;
      name: string;
      headline: string;
      tags: string[];
    }
  | {
      type: 'company';
      id: string;
      name: string;
      industry: string;
      hiringFor: string[];
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

  const myTags = useMemo(() => {
    const skills = (professional?.skills || []).map(normalizeTag);
    const headline = normalizeTag(professional?.headline || '');
    const location = normalizeTag(professional?.location || '');
    const bio = normalizeTag(professional?.bio || '');
    return Array.from(new Set([location, headline, bio, ...skills].filter(Boolean)));
  }, [professional]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const base: Suggestion[] = [
      {
        type: 'person',
        id: 'p-1',
        name: 'Lerato Mokoena',
        headline: 'Frontend Developer · React · UI Systems',
        tags: ['react', 'typescript', 'ui', 'tailwind'],
      },
      {
        type: 'person',
        id: 'p-2',
        name: 'Kabelo Dlamini',
        headline: 'Product Designer · Mobile UX · Prototyping',
        tags: ['ux', 'mobile', 'figma', 'design'],
      },
      {
        type: 'person',
        id: 'p-3',
        name: 'Amina Yusuf',
        headline: 'Data Analyst · BI · Dashboards',
        tags: ['analytics', 'sql', 'powerbi', 'dashboards'],
      },
      {
        type: 'company',
        id: 'c-1',
        name: 'NovaBuild Solutions',
        industry: 'Construction · Real Estate',
        hiringFor: ['Project Manager', 'Site Engineer', 'Account Executive'],
        tags: ['construction', 'business', 'engineering'],
      },
      {
        type: 'company',
        id: 'c-2',
        name: 'CloudHarbor Tech',
        industry: 'Software · FinTech',
        hiringFor: ['Frontend Engineer', 'Backend Engineer', 'Product Designer'],
        tags: ['react', 'fintech', 'typescript', 'design'],
      },
      {
        type: 'company',
        id: 'c-3',
        name: 'HealthSpring Clinics',
        industry: 'Healthcare',
        hiringFor: ['Marketing Lead', 'Customer Support', 'Data Analyst'],
        tags: ['health', 'analytics', 'marketing'],
      },
    ];

    const score = (s: Suggestion) => {
      const tags = (s.type === 'company' ? s.tags : s.tags).map(normalizeTag);
      const matches = tags.filter((t) => myTags.includes(t)).length;
      return matches;
    };

    return base
      .map((s) => ({ s, score: score(s) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
  }, [myTags]);

  const filtered = useMemo(() => {
    if (activeFilter === 'people') return suggestions.filter((s) => s.type === 'person');
    if (activeFilter === 'companies') return suggestions.filter((s) => s.type === 'company');
    return suggestions.filter((s) => s.type === 'company' && (s.hiringFor?.length || 0) > 0);
  }, [activeFilter, suggestions]);

  const toggleFollow = (s: Suggestion) => {
    const isFollowing = !!followed[s.id];
    setFollowed((prev) => ({ ...prev, [s.id]: !isFollowing }));
    try {
      if (isFollowing) unfollowUser(s.id);
      else followUser(s.id);
    } catch {
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-24">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Connect</h1>
          <p className="text-xs text-muted-foreground">
            Suggested people and companies based on your professional profile.
            {user?.name ? ` (Hi ${user.name})` : ''}
          </p>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'people' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setActiveFilter('people')}
          >
            People
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'companies' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setActiveFilter('companies')}
          >
            Companies
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'hiring' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setActiveFilter('hiring')}
          >
            Hiring now
          </Button>
        </div>

        {myTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {myTags.slice(0, 8).map((t) => (
              <Badge key={t} variant="secondary" className="capitalize">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {s.type === 'company' ? (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.type === 'company' ? s.industry : s.headline}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={followed[s.id] ? 'default' : 'outline'}
                        className="rounded-full"
                        onClick={() => toggleFollow(s)}
                      >
                        {followed[s.id] ? 'Following' : 'Follow'}
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.tags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="outline" className="capitalize">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    {s.type === 'company' && s.hiringFor?.length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Hiring for: <span className="text-foreground">{s.hiringFor.slice(0, 3).join(', ')}</span>
                      </div>
                    )}
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

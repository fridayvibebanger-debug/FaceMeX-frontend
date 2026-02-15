import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { Users, Briefcase, Palette, Megaphone, Code2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const GROUPS = [
  {
    id: 'g1',
    name: 'Design & UX Circle',
    industry: 'Design',
    description: 'Interface, product, and motion designers exploring human-centred, emotionally-aware experiences.',
    members: 184,
    icon: Palette,
  },
  {
    id: 'g2',
    name: 'Engineers & Builders',
    industry: 'Engineering',
    description: 'Frontend, backend, and AI engineers sharing patterns, architecture notes, and experiments.',
    members: 276,
    icon: Code2,
  },
  {
    id: 'g3',
    name: 'Marketing & Growth Lab',
    industry: 'Marketing',
    description: 'Strategists and creators focused on campaigns, analytics, and human-first growth stories.',
    members: 132,
    icon: Megaphone,
  },
  {
    id: 'g4',
    name: 'Founders & Operators',
    industry: 'Business',
    description: 'Founders, PMs, and operators working on products, teams, and sustainable ecosystems.',
    members: 97,
    icon: Briefcase,
  },
];

function getGroupIcon(group: any) {
  const id = String(group?.id || '');
  if (id === 'g1') return Palette;
  if (id === 'g2') return Code2;
  if (id === 'g3') return Megaphone;
  if (id === 'g4') return Briefcase;
  const industry = String(group?.industry || '').toLowerCase();
  if (industry.includes('design')) return Palette;
  if (industry.includes('engineer') || industry.includes('software') || industry.includes('dev')) return Code2;
  if (industry.includes('market')) return Megaphone;
  if (industry.includes('business') || industry.includes('finance') || industry.includes('sales')) return Briefcase;
  return Users;
}

export default function ProfessionalGroupsPage() {
  const navigate = useNavigate();
  const [joined, setJoined] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('proGroups:joined');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const { hasTier } = useUserStore();
  const canCreate = hasTier('business');
  const [groups, setGroups] = useState(() => {
    try {
      const raw = localStorage.getItem('proGroups:list');
      return raw ? JSON.parse(raw) : GROUPS;
    } catch {
      return GROUPS;
    }
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', industry: '', description: '' });

  useEffect(() => {
    try {
      localStorage.setItem('proGroups:list', JSON.stringify(groups));
    } catch {
    }
  }, [groups]);

  useEffect(() => {
    try {
      localStorage.setItem('proGroups:joined', JSON.stringify(joined));
    } catch {
    }
  }, [joined]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get('/api/pro-groups');
        if (cancelled) return;
        if (Array.isArray(list) && list.length) {
          setGroups((prev) => {
            const merged = list.map((g: any) => ({
              ...g,
              members: g.memberCount ?? g.members ?? g.membersCount ?? g.members,
              icon: prev.find((p: any) => p.id === g.id)?.icon,
            }));
            return merged;
          });
          setJoined((prev) => {
            const next = { ...prev };
            for (const g of list) {
              if (g?.id) next[g.id] = !!g.joined;
            }
            return next;
          });
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleJoin = async (groupId: string) => {
    const next = !joined[groupId];

    setJoined((prev) => ({ ...prev, [groupId]: next }));
    setGroups((prev: any) =>
      prev.map((g: any) =>
        g.id === groupId
          ? {
              ...g,
              members: Math.max(0, (Number(g.members ?? g.memberCount ?? 0) || 0) + (next ? 1 : -1)),
              memberCount: Math.max(0, (Number(g.memberCount ?? g.members ?? 0) || 0) + (next ? 1 : -1)),
              joined: next,
            }
          : g
      )
    );

    try {
      await api.post(`/api/pro-groups/${groupId}/${next ? 'join' : 'leave'}`, {});
    } catch {
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto p-4 space-y-4 pt-14 md:pt-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-base sm:text-lg font-semibold">Professional Groups</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground max-w-xl">
                Join industry-focused spaces for professional discussions, resources, and collaborations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create Pro Group
              </Button>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Business tier required to create</Badge>
            )}
            <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 text-[10px]">
              <Briefcase className="h-3 w-3" />
              Professional layer
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const Icon = getGroupIcon(g);
            const isJoined = !!joined[g.id];
            return (
              <Card key={g.id} className="border flex flex-col justify-between">
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm leading-tight">{g.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground">{g.industry}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{g.members} members</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <p className="text-muted-foreground">{g.description}</p>
                  <div className="flex justify-between items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{isJoined ? 'You have joined this group.' : 'Preview-only group (demo).'}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-3"
                        type="button"
                        onClick={() => navigate(`/groups/pro/${g.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant={isJoined ? 'outline' : 'default'}
                        className="text-[11px] px-3"
                        type="button"
                        onClick={() => handleToggleJoin(g.id)}
                      >
                        {isJoined ? 'Leave' : 'Join'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Pro Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Group name</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Industry</Label>
                <Input value={createForm.industry} onChange={(e) => setCreateForm((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} placeholder="What is this group about?" />
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                onClick={() => {
                  if (!canCreate) return;
                  if (!createForm.name.trim()) return;
                  const g = {
                    id: `g${Date.now()}`,
                    name: createForm.name.trim(),
                    industry: (createForm.industry || 'General').trim(),
                    description: (createForm.description || '').trim(),
                    members: 1,
                    icon: Users,
                  };
                  setGroups((prev) => [g, ...prev]);
                  setJoined((prev) => ({ ...prev, [g.id]: true }));
                  setCreateForm({ name: '', industry: '', description: '' });
                  setCreateOpen(false);
                }}
                disabled={!canCreate || !createForm.name.trim()}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

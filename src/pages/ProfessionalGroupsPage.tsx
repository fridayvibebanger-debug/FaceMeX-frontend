import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Palette,
  Megaphone,
  Code2,
  Crown,
  Shield,
  Trash2,
  UserMinus,
  Ban,
  UserCog,
  Plus,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/store/userStore';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type MemberRole = 'owner' | 'admin' | 'member';

type ProGroup = {
  id: string;
  name: string;
  industry: string;
  description: string;
  members: number;
  memberCount?: number;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
};

type ProGroupMember = {
  id: string;
  name: string;
  avatar?: string;
  role: MemberRole;
  joinedAt: string;
};

const GROUPS: ProGroup[] = [
  {
    id: 'g1',
    name: 'Design & UX Circle',
    industry: 'Design',
    description:
      'Interface, product, and motion designers exploring human-centred, emotionally-aware experiences.',
    members: 184,
  },
  {
    id: 'g2',
    name: 'Engineers & Builders',
    industry: 'Engineering',
    description:
      'Frontend, backend, and AI engineers sharing patterns, architecture notes, and experiments.',
    members: 276,
  },
  {
    id: 'g3',
    name: 'Marketing & Growth Lab',
    industry: 'Marketing',
    description:
      'Strategists and creators focused on campaigns, analytics, and human-first growth stories.',
    members: 132,
  },
  {
    id: 'g4',
    name: 'Founders & Operators',
    industry: 'Business',
    description:
      'Founders, PMs, and operators working on products, teams, and sustainable ecosystems.',
    members: 97,
  },
];

const tierRank: Record<string, number> = {
  free: 0,
  verified: 0,
  pro: 1,
  creator: 2,
  business: 3,
  exclusive: 4,
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function getGroupIcon(group: ProGroup) {
  const id = String(group?.id || '');

  if (id === 'g1') return Palette;
  if (id === 'g2') return Code2;
  if (id === 'g3') return Megaphone;
  if (id === 'g4') return Briefcase;

  const industry = String(group?.industry || '').toLowerCase();

  if (industry.includes('design')) return Palette;
  if (
    industry.includes('engineer') ||
    industry.includes('software') ||
    industry.includes('dev') ||
    industry.includes('code')
  ) {
    return Code2;
  }

  if (industry.includes('market') || industry.includes('growth')) {
    return Megaphone;
  }

  if (
    industry.includes('business') ||
    industry.includes('finance') ||
    industry.includes('sales') ||
    industry.includes('founder')
  ) {
    return Briefcase;
  }

  return Users;
}

function getInitials(name?: string) {
  const clean = String(name || 'User').trim();
  return clean.charAt(0).toUpperCase();
}

export default function ProfessionalGroupsPage() {
  const navigate = useNavigate();
  const userStore: any = useUserStore();

  const userId = String(
    userStore.id ||
      userStore.user?.id ||
      userStore.profile?.id ||
      userStore.profile?.user_id ||
      'local-user'
  );

  const userName =
    userStore.name ||
    userStore.user?.name ||
    userStore.profile?.name ||
    userStore.profile?.full_name ||
    'FaceMeX User';

  const avatar =
    userStore.avatar ||
    userStore.user?.avatar ||
    userStore.profile?.avatar ||
    userStore.profile?.avatar_url ||
    '';

  const currentTier = String(
    userStore.tier ||
      userStore.currentTier ||
      userStore.user?.tier ||
      userStore.user?.subscription_tier ||
      userStore.profile?.tier ||
      userStore.profile?.subscription_tier ||
      localStorage.getItem('facemex_current_tier') ||
      'free'
  )
    .toLowerCase()
    .trim();

  const canCreate =
    Boolean(userStore.hasTier?.('creator')) ||
    (tierRank[currentTier] || 0) >= tierRank.creator;

  const [groups, setGroups] = useState<ProGroup[]>(() =>
    readLocal<ProGroup[]>('proGroups:list', GROUPS)
  );

  const [joined, setJoined] = useState<Record<string, boolean>>(() =>
    readLocal<Record<string, boolean>>('proGroups:joined', {})
  );

  const [membersByGroup, setMembersByGroup] = useState<
    Record<string, ProGroupMember[]>
  >(() => readLocal<Record<string, ProGroupMember[]>>('proGroups:members', {}));

  const [bannedByGroup, setBannedByGroup] = useState<Record<string, string[]>>(
    () => readLocal<Record<string, string[]>>('proGroups:banned', {})
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    industry: '',
    description: '',
  });

  const [adminSearch, setAdminSearch] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const selectedMembers = selectedGroup
    ? membersByGroup[selectedGroup.id] || []
    : [];

  useEffect(() => {
    writeLocal('proGroups:list', groups);
  }, [groups]);

  useEffect(() => {
    writeLocal('proGroups:joined', joined);
  }, [joined]);

  useEffect(() => {
    writeLocal('proGroups:members', membersByGroup);
  }, [membersByGroup]);

  useEffect(() => {
    writeLocal('proGroups:banned', bannedByGroup);
  }, [bannedByGroup]);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        const list = await api.get('/api/pro-groups');

        if (cancelled) return;

        if (Array.isArray(list) && list.length) {
          setGroups((current) => {
            const localCreated = current.filter((group) =>
              String(group.id).startsWith('local-pro-group-')
            );

            const apiGroups: ProGroup[] = list.map((group: any) => ({
              id: String(group.id),
              name: group.name || 'Untitled Group',
              industry: group.industry || 'General',
              description:
                group.description ||
                'Professional group for focused discussion and collaboration.',
              members:
                Number(group.memberCount ?? group.members ?? group.membersCount) ||
                0,
              memberCount:
                Number(group.memberCount ?? group.members ?? group.membersCount) ||
                0,
              authorId: group.authorId || group.author_id || group.ownerId,
              authorName: group.authorName || group.author_name || group.ownerName,
              createdAt: group.createdAt || group.created_at,
            }));

            const merged = [...localCreated, ...apiGroups];

            return merged.length ? merged : current;
          });

          setJoined((current) => {
            const next = { ...current };

            for (const group of list) {
              if (group?.id) next[group.id] = !!group.joined;
            }

            return next;
          });
        }
      } catch {
        // local groups still work
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthor = (group: ProGroup) => {
    return (
      String(group.authorId || '') === userId ||
      String(group.authorName || '').toLowerCase().trim() ===
        String(userName || '').toLowerCase().trim()
    );
  };

  const getMembers = (groupId: string) => {
    return membersByGroup[groupId] || [];
  };

  const isBanned = (groupId: string) => {
    return Boolean((bannedByGroup[groupId] || []).includes(userId));
  };

  const makeOwnerMember = (): ProGroupMember => ({
    id: userId,
    name: userName,
    avatar,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  });

  const upsertMember = (
    groupId: string,
    member: ProGroupMember,
    mode: 'join' | 'update' = 'join'
  ) => {
    setMembersByGroup((current) => {
      const existing = current[groupId] || [];
      const already = existing.find((item) => item.id === member.id);

      const nextMembers = already
        ? existing.map((item) =>
            item.id === member.id
              ? {
                  ...item,
                  ...(mode === 'update' ? member : {}),
                }
              : item
          )
        : [member, ...existing];

      return {
        ...current,
        [groupId]: nextMembers,
      };
    });
  };

  const updateGroupMemberRole = (
    groupId: string,
    memberId: string,
    role: MemberRole
  ) => {
    setMembersByGroup((current) => ({
      ...current,
      [groupId]: (current[groupId] || []).map((member) =>
        member.id === memberId ? { ...member, role } : member
      ),
    }));
  };

  const removeMember = (groupId: string, memberId: string) => {
    setMembersByGroup((current) => ({
      ...current,
      [groupId]: (current[groupId] || []).filter(
        (member) => member.id !== memberId
      ),
    }));

    setJoined((current) => {
      if (memberId !== userId) return current;

      return {
        ...current,
        [groupId]: false,
      };
    });

    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              members: Math.max(0, Number(group.members || 0) - 1),
              memberCount: Math.max(0, Number(group.memberCount || group.members || 0) - 1),
            }
          : group
      )
    );
  };

  const banMember = (groupId: string, memberId: string) => {
    removeMember(groupId, memberId);

    setBannedByGroup((current) => ({
      ...current,
      [groupId]: [...new Set([...(current[groupId] || []), memberId])],
    }));
  };

  const handleToggleJoin = async (group: ProGroup) => {
    if (isBanned(group.id)) {
      toast({
        title: 'Access blocked',
        description: 'You cannot join this group because the author removed your access.',
        variant: 'destructive',
      });
      return;
    }

    const nextJoined = !joined[group.id];

    if (nextJoined) {
      upsertMember(group.id, {
        id: userId,
        name: userName,
        avatar,
        role: isAuthor(group) ? 'owner' : 'member',
        joinedAt: new Date().toISOString(),
      });
    } else {
      if (isAuthor(group)) {
        toast({
          title: 'Author cannot leave',
          description: 'The author controls the group. Delete the group if you want to remove it.',
        });
        return;
      }

      removeMember(group.id, userId);
    }

    setJoined((current) => ({
      ...current,
      [group.id]: nextJoined,
    }));

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
              ...item,
              members: Math.max(
                0,
                Number(item.members ?? item.memberCount ?? 0) +
                  (nextJoined ? 1 : -1)
              ),
              memberCount: Math.max(
                0,
                Number(item.memberCount ?? item.members ?? 0) +
                  (nextJoined ? 1 : -1)
              ),
            }
          : item
      )
    );

    try {
      await api.post(
        `/api/pro-groups/${group.id}/${nextJoined ? 'join' : 'leave'}`,
        {}
      );
    } catch {
      // local-first action still works
    }
  };

  const handleCreateGroup = async () => {
    if (!canCreate) {
      toast({
        title: 'Creator tier required',
        description: 'Creator, Business and Exclusive users can create Professional Groups.',
      });
      return;
    }

    if (!createForm.name.trim()) {
      toast({
        title: 'Group name required',
        description: 'Add a professional group name first.',
      });
      return;
    }

    const group: ProGroup = {
      id: `local-pro-group-${Date.now()}`,
      name: createForm.name.trim(),
      industry: (createForm.industry || 'General').trim(),
      description:
        createForm.description.trim() ||
        'A focused professional group for discussion, resources and collaboration.',
      members: 1,
      memberCount: 1,
      authorId: userId,
      authorName: userName,
      createdAt: new Date().toISOString(),
    };

    setGroups((current) => [group, ...current]);

    setJoined((current) => ({
      ...current,
      [group.id]: true,
    }));

    setMembersByGroup((current) => ({
      ...current,
      [group.id]: [makeOwnerMember()],
    }));

    setCreateForm({
      name: '',
      industry: '',
      description: '',
    });

    setCreateOpen(false);

    try {
      await api.post('/api/pro-groups', group);
    } catch {
      // local-first group still works
    }

    toast({
      title: 'Professional group created',
      description: 'You are the author and owner of this group.',
    });
  };

  const openManage = (group: ProGroup) => {
    if (!isAuthor(group)) return;

    if (!getMembers(group.id).some((member) => member.id === userId)) {
      upsertMember(group.id, makeOwnerMember());
    }

    setSelectedGroupId(group.id);
    setAdminFeedback('');
    setAdminSearch('');
    setManageOpen(true);
  };

  const handleQuickAddAdmin = () => {
    if (!selectedGroup) return;

    const query = adminSearch.trim().toLowerCase();

    if (!query) {
      setAdminFeedback('Enter a member name or ID.');
      return;
    }

    const member = selectedMembers.find(
      (item) =>
        String(item.id).toLowerCase() === query ||
        String(item.name).toLowerCase().includes(query)
    );

    if (!member) {
      setAdminFeedback('Member not found. They must join the group first.');
      return;
    }

    if (member.role === 'owner') {
      setAdminFeedback('The author already has full control.');
      return;
    }

    updateGroupMemberRole(selectedGroup.id, member.id, 'admin');
    setAdminSearch('');
    setAdminFeedback(`${member.name} is now an admin.`);
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup || !isAuthor(selectedGroup)) return;

    setGroups((current) =>
      current.filter((group) => group.id !== selectedGroup.id)
    );

    setJoined((current) => {
      const next = { ...current };
      delete next[selectedGroup.id];
      return next;
    });

    setMembersByGroup((current) => {
      const next = { ...current };
      delete next[selectedGroup.id];
      return next;
    });

    setBannedByGroup((current) => {
      const next = { ...current };
      delete next[selectedGroup.id];
      return next;
    });

    setDeleteOpen(false);
    setManageOpen(false);
    setSelectedGroupId(null);

    toast({
      title: 'Group deleted',
      description: 'The professional group was removed.',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="mx-auto max-w-5xl space-y-4 p-4 pt-14 md:pt-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-purple-500 text-white shadow-sm">
              <Users className="h-4 w-4" />
            </div>

            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                Professional Groups
              </h1>

              <p className="max-w-xl text-[11px] text-muted-foreground sm:text-xs">
                Join industry-focused spaces for professional discussions, resources and collaborations.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canCreate ? (
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => setCreateOpen(true)}
              >
                Create Pro Group
              </Button>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Creator+ required to create
              </Badge>
            )}

            <Badge
              variant="outline"
              className="hidden items-center gap-1 text-[10px] sm:inline-flex"
            >
              <Briefcase className="h-3 w-3" />
              Professional layer
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => {
            const Icon = getGroupIcon(group);
            const isJoined = !!joined[group.id];
            const author = isAuthor(group);
            const banned = isBanned(group.id);
            const members = getMembers(group.id);
            const admins = members.filter((member) => member.role === 'admin');

            return (
              <Card
                key={group.id}
                className="flex flex-col justify-between rounded-2xl border bg-card shadow-sm"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm leading-tight">
                        {group.name}
                      </CardTitle>

                      <p className="truncate text-[11px] text-muted-foreground">
                        {group.industry}
                      </p>
                    </div>
                  </div>

                  <Badge variant="secondary" className="whitespace-nowrap text-[10px]">
                    {(group.members ?? group.memberCount ?? 0).toLocaleString()} members
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <p className="min-h-[48px] text-muted-foreground">
                    {group.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {author && (
                      <Badge className="rounded-full text-[10px]">
                        <Crown className="mr-1 h-3 w-3" />
                        Author
                      </Badge>
                    )}

                    {admins.length > 0 && (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        <Shield className="mr-1 h-3 w-3" />
                        {admins.length} admin{admins.length === 1 ? '' : 's'}
                      </Badge>
                    )}

                    {banned && (
                      <Badge variant="destructive" className="rounded-full text-[10px]">
                        Banned
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {banned
                        ? 'You cannot access this group.'
                        : isJoined
                          ? 'You are a member and can participate.'
                          : 'Join to participate in this group.'}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 text-[11px]"
                        type="button"
                        onClick={() => navigate(`/groups/pro/${group.id}`)}
                        disabled={banned}
                      >
                        View
                      </Button>

                      <Button
                        size="sm"
                        variant={isJoined ? 'outline' : 'default'}
                        className="rounded-full px-3 text-[11px]"
                        type="button"
                        onClick={() => handleToggleJoin(group)}
                        disabled={banned}
                      >
                        {isJoined ? 'Leave' : 'Join'}
                      </Button>

                      {author && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-full px-3 text-[11px]"
                          type="button"
                          onClick={() => openManage(group)}
                        >
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle>Create Professional Group</DialogTitle>
              <DialogDescription>
                Creator, Business and Exclusive users can create professional groups. Free and Pro users can join and participate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Group name</Label>
                <Input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Example: Limpopo Founders Network"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Industry</Label>
                <Input
                  value={createForm.industry}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      industry: event.target.value,
                    }))
                  }
                  placeholder="Example: Business, Engineering, Finance"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What is this group about?"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                className="rounded-full"
                onClick={handleCreateGroup}
                disabled={!canCreate || !createForm.name.trim()}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>Manage Professional Group</DialogTitle>
              <DialogDescription>
                Only the author can delete this group, choose admins, remove users or ban users.
              </DialogDescription>
            </DialogHeader>

            {selectedGroup && (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {selectedGroup.name}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Author: {selectedGroup.authorName || userName}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Choose admin</Label>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Search member name or paste member ID"
                      value={adminSearch}
                      onChange={(event) => setAdminSearch(event.target.value)}
                    />

                    <Button className="rounded-full" onClick={handleQuickAddAdmin}>
                      <UserCog className="h-4 w-4" />
                    </Button>
                  </div>

                  {adminFeedback && (
                    <p className="text-xs text-muted-foreground">{adminFeedback}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Members</div>

                  {selectedMembers.length === 0 ? (
                    <div className="rounded-2xl border bg-background/60 p-3 text-xs text-muted-foreground">
                      No members yet.
                    </div>
                  ) : (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {selectedMembers.map((member) => {
                        const owner = member.role === 'owner';
                        const self = member.id === userId;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                  {getInitials(member.name)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {member.name}
                                </div>

                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {member.role}
                                </div>
                              </div>
                            </div>

                            {!owner && !self && (
                              <div className="flex shrink-0 flex-wrap items-center gap-1">
                                {member.role === 'member' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-full px-2 text-[10px]"
                                    onClick={() =>
                                      updateGroupMemberRole(
                                        selectedGroup.id,
                                        member.id,
                                        'admin'
                                      )
                                    }
                                  >
                                    Admin
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-full px-2 text-[10px]"
                                    onClick={() =>
                                      updateGroupMemberRole(
                                        selectedGroup.id,
                                        member.id,
                                        'member'
                                      )
                                    }
                                  >
                                    Demote
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-full px-2 text-[10px] text-red-500"
                                  onClick={() => removeMember(selectedGroup.id, member.id)}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-full px-2 text-[10px] text-red-500"
                                  onClick={() => banMember(selectedGroup.id, member.id)}
                                >
                                  <Ban className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setManageOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Delete group?</DialogTitle>
              <DialogDescription>
                This removes the professional group from the app. Only the author can do this.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-200">
              This action cannot be undone locally. Members will lose access to this group.
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                className="rounded-full"
                onClick={handleDeleteGroup}
              >
                Delete group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

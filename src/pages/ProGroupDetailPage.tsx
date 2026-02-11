import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import { Users, ChevronLeft, Heart, MessageCircle, Pin, Image as ImageIcon, Mic, Square } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

type ProGroup = {
  id: string;
  name: string;
  industry: string;
  description: string;
  members?: number;
  memberCount?: number;
  joined?: boolean;
  isAdmin?: boolean;
};

type ProGroupComment = {
  id: string;
  authorId: string;
  authorName: string;
  voiceNote?: {
    type: string;
    dataUrl: string;
    durationMs?: number;
  };
  createdAt: string;
};

type ProGroupPost = {
  id: string;
  groupId: string;
  authorId?: string;
  authorName: string;
  content: string;
  attachments?: Array<{ name: string; type: string; dataUrl: string }>;
  createdAt: string;
  pinned?: boolean;
  announcement?: boolean;
  likeUserIds?: string[];
  comments?: ProGroupComment[];
};

const DEFAULT_GROUPS: ProGroup[] = [
  {
    id: 'g1',
    name: 'Design & UX Circle',
    industry: 'Design',
    description: 'Interface, product, and motion designers exploring human-centred, emotionally-aware experiences.',
    members: 184,
  },
  {
    id: 'g2',
    name: 'Engineers & Builders',
    industry: 'Engineering',
    description: 'Frontend, backend, and AI engineers sharing patterns, architecture notes, and experiments.',
    members: 276,
  },
  {
    id: 'g3',
    name: 'Marketing & Growth Lab',
    industry: 'Marketing',
    description: 'Strategists and creators focused on campaigns, analytics, and human-first growth stories.',
    members: 132,
  },
  {
    id: 'g4',
    name: 'Founders & Operators',
    industry: 'Business',
    description: 'Founders, PMs, and operators working on products, teams, and sustainable ecosystems.',
    members: 97,
  },
];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export default function ProGroupDetailPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const { id: myUserId, hasTier } = useUserStore();
  const canModerate = hasTier('creator');
  const canVoiceComment = hasTier('creator');

  const [groups, setGroups] = useState<ProGroup[]>(() => loadJson('proGroups:list', DEFAULT_GROUPS));
  const [joined, setJoined] = useState<Record<string, boolean>>(() => loadJson('proGroups:joined', {}));
  const [draft, setDraft] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [postFiles, setPostFiles] = useState<Array<{ name: string; type: string; dataUrl: string }>>([]);
  const [isPostingMedia, setIsPostingMedia] = useState(false);

  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const recorderRef = (globalThis as any).__pg_recorder_ref || { current: null as MediaRecorder | null };
  (globalThis as any).__pg_recorder_ref = recorderRef;
  const chunksRef = (globalThis as any).__pg_chunks_ref || { current: [] as BlobPart[] };
  (globalThis as any).__pg_chunks_ref = chunksRef;
  const recordStartRef = (globalThis as any).__pg_rec_start_ref || { current: 0 };
  (globalThis as any).__pg_rec_start_ref = recordStartRef;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read_failed'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read_failed'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });

  const group = useMemo(() => groups.find((g) => g.id === groupId) || null, [groups, groupId]);
  const isJoined = !!(groupId && joined[groupId]);

  const [posts, setPosts] = useState<ProGroupPost[]>(() => {
    const all = loadJson<Record<string, ProGroupPost[]>>('proGroups:posts', {});
    return (groupId && all[groupId]) ? all[groupId] : [];
  });

  useEffect(() => {
    saveJson('proGroups:list', groups);
  }, [groups]);

  useEffect(() => {
    saveJson('proGroups:joined', joined);
  }, [joined]);

  useEffect(() => {
    const all = loadJson<Record<string, ProGroupPost[]>>('proGroups:posts', {});
    setPosts((groupId && all[groupId]) ? all[groupId] : []);
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!groupId) return;
      try {
        const data = await api.get(`/api/pro-groups/${groupId}`);
        if (cancelled) return;

        const g: ProGroup | null = data?.group || null;
        const nextPosts: ProGroupPost[] = Array.isArray(data?.posts) ? data.posts : [];

        if (g) {
          setGroups((prev) => {
            const exists = prev.some((x) => x.id === g.id);
            const merged = exists
              ? prev.map((x) => (x.id === g.id ? { ...x, ...g } : x))
              : [g, ...prev];
            return merged;
          });
          setJoined((prev) => ({ ...prev, [groupId]: !!g.joined }));
        }

        persistPosts(nextPosts);
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const persistPosts = (next: ProGroupPost[]) => {
    const all = loadJson<Record<string, ProGroupPost[]>>('proGroups:posts', {});
    if (groupId) {
      all[groupId] = next;
      saveJson('proGroups:posts', all);
    }
    setPosts(next);
  };

  const handleToggleJoin = async () => {
    if (!groupId) return;
    const next = !isJoined;

    setJoined((prev) => ({ ...prev, [groupId]: next }));

    try {
      await api.post(`/api/pro-groups/${groupId}/${next ? 'join' : 'leave'}`, {});
    } catch {
    }

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: Math.max(0, ((g.members ?? g.memberCount ?? 0) as number) + (next ? 1 : -1)),
              memberCount: Math.max(0, ((g.memberCount ?? g.members ?? 0) as number) + (next ? 1 : -1)),
              joined: next,
            }
          : g
      )
    );
  };

  const handlePost = async () => {
    if (!groupId) return;
    if (!isJoined) return;
    const text = draft.trim();
    if (!text && postFiles.length === 0) return;

    const optimistic: ProGroupPost = {
      id: `pgp${Date.now()}`,
      groupId,
      authorId: myUserId,
      authorName: 'You',
      content: text,
      attachments: postFiles,
      createdAt: new Date().toISOString(),
      pinned: false,
      announcement: !!announce,
      likeUserIds: [],
      comments: [],
    };

    persistPosts([optimistic, ...posts]);
    setDraft('');
    setPostFiles([]);

    try {
      const created = await api.post(`/api/pro-groups/${groupId}/posts`, {
        content: text,
        announcement: !!announce,
        attachments: postFiles,
      });
      if (created?.id) {
        persistPosts([created, ...posts]);
      }
    } catch {
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!groupId) return;
    if (!isJoined) return;

    const nextPosts = posts.map((p) => {
      if (p.id !== postId) return p;
      const list = Array.isArray(p.likeUserIds) ? p.likeUserIds : [];
      const has = list.includes(myUserId);
      return {
        ...p,
        likeUserIds: has ? list.filter((id) => id !== myUserId) : [myUserId, ...list],
      };
    });
    persistPosts(nextPosts);

    try {
      await api.post(`/api/pro-groups/${groupId}/posts/${postId}/like`, {});
    } catch {
    }
  };

  const handlePickMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsPostingMedia(true);
    try {
      const list = Array.from(files)
        .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
        .slice(0, 4);

      const mapped = await Promise.all(
        list.map(async (f) => ({
          name: f.name,
          type: f.type,
          dataUrl: await fileToDataUrl(f),
        }))
      );
      setPostFiles(mapped);
    } finally {
      setIsPostingMedia(false);
    }
  };

  const startVoiceComment = async (postId: string) => {
    if (!canVoiceComment) return;
    if (!isJoined) return;
    if (recordingFor) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recordStartRef.current = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
      }
    };
    recorderRef.current = rec;
    setRecordingFor(postId);
    rec.start();
  };

  const stopVoiceComment = async (postId: string) => {
    if (!recordingFor || recordingFor !== postId) return;
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
    }

    const durationMs = Date.now() - (recordStartRef.current || Date.now());
    const type = rec.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type });
    const dataUrl = await blobToDataUrl(blob);

    setRecordingFor(null);
    recorderRef.current = null;
    chunksRef.current = [];

    if (!groupId) return;

    const optimistic: ProGroupComment = {
      id: `pgc${Date.now()}`,
      authorId: myUserId,
      authorName: 'You',
      voiceNote: { type, dataUrl, durationMs },
      createdAt: new Date().toISOString(),
    };

    const nextPosts = posts.map((p) =>
      p.id === postId ? { ...p, comments: [...(p.comments || []), optimistic] } : p
    );
    persistPosts(nextPosts);

    try {
      const created = await api.post(`/api/pro-groups/${groupId}/posts/${postId}/comments`, {
        voiceNote: { type, dataUrl, durationMs },
      });
      if (created?.id) {
        const replacePosts = posts.map((p) => {
          if (p.id !== postId) return p;
          const base = Array.isArray(p.comments) ? p.comments : [];
          return { ...p, comments: [...base, created] };
        });
        persistPosts(replacePosts);
      }
    } catch {
    }
  };

  const handleTogglePin = async (postId: string, pinned: boolean) => {
    if (!groupId) return;
    if (!group?.isAdmin) return;
    if (!canModerate) return;

    const nextPosts = posts.map((p) => {
      if (p.id === postId) return { ...p, pinned };
      if (pinned) return { ...p, pinned: false };
      return p;
    });
    persistPosts(nextPosts);

    try {
      await api.patch(`/api/pro-groups/${groupId}/posts/${postId}/pin`, { pinned });
    } catch {
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 space-y-4 pt-14 md:pt-16">
          <Button variant="ghost" onClick={() => navigate('/groups/pro')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Group not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This group may have been deleted or is unavailable.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar /> pt-14 md:pt-16
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-20">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/groups/pro')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Groups
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Pro Group</Badge>
            <Button size="sm" variant={isJoined ? 'outline' : 'default'} onClick={handleToggleJoin}>
              {isJoined ? 'Joined' : 'Join'}
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-purple-500 text-white flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{group.industry}</Badge>
                    <span className="text-[11px] text-muted-foreground">{group.memberCount ?? group.members ?? 0} members</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {group.description}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Group feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isJoined ? (
              <div className="space-y-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="text-sm" placeholder="Write a post…" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePickMedia(e.target.files)}
                      />
                      <Button size="sm" variant="outline" type="button" disabled={isPostingMedia}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Media
                      </Button>
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {postFiles.length > 0 ? `${postFiles.length} attached` : ''}
                    </div>
                  </div>
                </div>
                {group?.isAdmin && canModerate && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">Posting as admin</div>
                    <Button
                      size="sm"
                      variant={announce ? 'default' : 'outline'}
                      type="button"
                      onClick={() => setAnnounce((v) => !v)}
                    >
                      {announce ? 'Announcement' : 'Normal'}
                    </Button>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={handlePost} disabled={!draft.trim() && postFiles.length === 0}>
                    Post
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                Join this Pro Group to post and participate.
              </div>
            )}

            <div className="space-y-3">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className={
                    p.pinned
                      ? 'rounded-xl border bg-card p-3 ring-1 ring-sky-500/30'
                      : 'rounded-xl border bg-card p-3'
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-xs font-semibold truncate">{p.authorName}</div>
                      {p.announcement && (
                        <Badge className="text-[10px]">Announcement</Badge>
                      )}
                      {p.pinned && (
                        <Badge variant="secondary" className="text-[10px] inline-flex items-center gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap break-words">{p.content}</div>

                  {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {p.attachments.map((a) => (
                        <div key={`${p.id}:${a.name}`} className="rounded-lg border bg-background overflow-hidden">
                          {a.type.startsWith('image/') ? (
                            <img src={a.dataUrl} alt={a.name} className="w-full h-auto" />
                          ) : a.type.startsWith('video/') ? (
                            <video src={a.dataUrl} controls className="w-full h-auto" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => handleToggleLike(p.id)}
                        disabled={!isJoined}
                        className={
                          (p.likeUserIds || []).includes(myUserId)
                            ? 'text-rose-600 border-rose-200 dark:border-rose-900/60'
                            : ''
                        }
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        {(p.likeUserIds || []).length}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setCommentOpen((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {(p.comments || []).length}
                      </Button>
                    </div>

                    {group?.isAdmin && canModerate && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => handleTogglePin(p.id, !p.pinned)}
                      >
                        <Pin className="h-4 w-4 mr-2" />
                        {p.pinned ? 'Unpin' : 'Pin'}
                      </Button>
                    )}
                  </div>

                  {commentOpen[p.id] && (
                    <div className="mt-3 space-y-2">
                      <div className="space-y-2">
                        {(p.comments || []).map((c) => (
                          <div key={c.id} className="rounded-lg border bg-background p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-semibold truncate">{c.authorName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(c.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {c.voiceNote?.dataUrl ? (
                              <audio className="mt-2 w-full" controls src={c.voiceNote.dataUrl} />
                            ) : (
                              <div className="mt-1 text-xs text-muted-foreground">Voice note unavailable.</div>
                            )}
                          </div>
                        ))}
                      </div>
                      {isJoined ? (
                        canVoiceComment ? (
                          <div className="flex items-center justify-between gap-2">
                            {recordingFor === p.id ? (
                              <div className="text-xs text-muted-foreground">Recording…</div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Tap record to send a voice note.</div>
                            )}
                            {recordingFor === p.id ? (
                              <Button size="sm" variant="destructive" type="button" onClick={() => stopVoiceComment(p.id)}>
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                              </Button>
                            ) : (
                              <Button size="sm" type="button" onClick={() => startVoiceComment(p.id)}>
                                <Mic className="h-4 w-4 mr-2" />
                                Record
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Creator tier required to comment.</div>
                        )
                      ) : (
                        <div className="text-xs text-muted-foreground">Join to comment.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-sm text-muted-foreground">No posts yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

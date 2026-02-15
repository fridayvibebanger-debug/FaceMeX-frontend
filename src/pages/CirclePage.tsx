import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useSocialStore } from '@/store/socialStore';
import { useUserStore } from '@/store/userStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Globe, Lock, ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    circles,
    circleMessages,
    circleMembers,
    joinCircle,
    leaveCircle,
    updateCircle,
    postCircleMessage,
    toggleReaction,
    togglePinCircleMessage,
    removeCircleMember,
    updateCircleMemberRole,
  } = useSocialStore();
  const { id: userId, name: userName, avatar } = useUserStore();

  const [newMessage, setNewMessage] = useState('');

  const circle = useMemo(() => circles.find((c) => c.id === (id || '')), [circles, id]);
  const messages = useMemo(
    () => (id && circleMessages[id]) || [],
    [circleMessages, id]
  );
  const pinned = useMemo(
    () => messages.filter((m) => m.pinned),
    [messages]
  );
  const members = useMemo(
    () => (id && circleMembers[id]) || [],
    [circleMembers, id]
  );

  if (!circle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex pt-16">
          <LeftSidebar />
          <main className="flex-1 lg:ml-64">
            <div className="max-w-4xl mx-auto py-10 px-4">
              <Button variant="ghost" onClick={() => navigate('/communities')} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Communities
              </Button>
              <p className="text-sm text-muted-foreground">Circle not found.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isCreator = circle.creatorId === userId;
  const currentMember = members.find((m) => m.id === userId);
  const canManageMembers = isCreator || currentMember?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        <LeftSidebar />
        <main className="flex-1 lg:ml-64">
          <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/communities')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Communities
            </Button>

            {/* Header */}
            <div className="rounded-2xl overflow-hidden border bg-card">
              <div className="h-44 w-full relative">
                <img
                  src={circle.coverImage}
                  alt={circle.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                      {circle.name}
                      <Badge variant="secondary" className="capitalize bg-white/90 text-slate-900">
                        {circle.category}
                      </Badge>
                    </h1>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-100/90">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {circle.memberCount.toLocaleString()} members
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {circle.isPrivate ? (
                          <>
                            <Lock className="h-3 w-3" /> Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" /> Public
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {circle.isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/90 text-slate-900"
                        onClick={() => leaveCircle(circle.id)}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        onClick={() => joinCircle(circle.id)}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-6">
              {/* Main channel area */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>About this circle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground whitespace-pre-wrap">{circle.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Created by <span className="font-medium">{circle.creatorName}</span>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Channel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {isCreator && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Share an update with your circle..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={2}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={!newMessage.trim()}
                            onClick={() => {
                              if (!newMessage.trim() || !circle) return;
                              postCircleMessage(circle.id, {
                                authorId: userId,
                                authorName: userName || 'You',
                                text: newMessage.trim(),
                              });
                              setNewMessage('');
                            }}
                          >
                            Post
                          </Button>
                        </div>
                      </div>
                    )}

                    {pinned.length > 0 && (
                      <div className="space-y-2 text-xs">
                        <div className="text-[11px] font-semibold text-muted-foreground">Pinned</div>
                        {pinned.map((m) => (
                          <div
                            key={`pinned-${m.id}`}
                            className="rounded-xl border px-3 py-2 bg-background/80"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-[11px]">{m.authorName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(m.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-[13px] text-foreground mb-1">{m.text}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background"
                                onClick={() => toggleReaction(circle.id, m.id, 'like', 1)}
                              >
                                <span>👍</span>
                                <span>{m.reactions?.like ?? 0}</span>
                              </button>
                              {isCreator && (
                                <button
                                  type="button"
                                  className="underline ml-auto"
                                  onClick={() => togglePinCircleMessage(circle.id, m.id)}
                                >
                                  Unpin
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No channel posts yet. {isCreator ? 'Share the first update with your members.' : 'Creator has not posted anything yet.'}
                        </p>
                      ) : (
                        messages.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border px-3 py-2 text-xs bg-background/60"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-[11px]">{m.authorName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(m.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-[13px] text-foreground mb-1">{m.text}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background"
                                onClick={() => toggleReaction(circle.id, m.id, 'like', 1)}
                              >
                                <span>👍</span>
                                <span>{m.reactions?.like ?? 0}</span>
                              </button>
                              {isCreator && (
                                <button
                                  type="button"
                                  className="underline ml-auto"
                                  onClick={() => togglePinCircleMessage(circle.id, m.id)}
                                >
                                  {m.pinned ? 'Unpin' : 'Pin'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Creator controls / sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Circle controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {isCreator ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          As the creator, you can update the circle description and visibility.
                        </p>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Description</label>
                          <Textarea
                            defaultValue={circle.description}
                            rows={3}
                            onBlur={(e) =>
                              updateCircle(circle.id, { description: e.target.value || circle.description })
                            }
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Changes save when you leave the field.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Visibility</label>
                          <div className="flex items-center gap-2 text-xs">
                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => updateCircle(circle.id, { isPrivate: false })}
                            >
                              <Globe className="h-3 w-3 mr-1" /> Public
                            </Button>
                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateCircle(circle.id, { isPrivate: true })}
                            >
                              <Lock className="h-3 w-3 mr-1" /> Private
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Only the creator can manage this circle. You can leave or mute from the
                        Communities page.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Members</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {members.length === 0 ? (
                      <p className="text-muted-foreground">
                        No members loaded yet. This panel is local-only for now.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {members.map((m) => {
                          const isOwner = m.role === 'owner';
                          const isSelf = m.id === userId;
                          const canActOn = canManageMembers && !isOwner && !isSelf;

                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-lg border px-2 py-1.5 bg-background/60"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={m.avatar || avatar}
                                  alt={m.name}
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium truncate text-[11px]">{m.name}</span>
                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {m.role}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Joined {formatDistanceToNow(m.joinedAt, { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                              {canActOn && (
                                <div className="flex items-center gap-1">
                                  {m.role === 'member' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateCircleMemberRole(circle.id, m.id, 'admin')}
                                    >
                                      Promote
                                    </Button>
                                  )}
                                  {m.role === 'admin' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateCircleMemberRole(circle.id, m.id, 'member')}
                                    >
                                      Demote
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => removeCircleMember(circle.id, m.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!canManageMembers && members.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Only the circle owner and admins can manage members.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

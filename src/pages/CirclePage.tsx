import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Globe,
  Lock,
  ArrowLeft,
  Send,
  Pin,
  PinOff,
  Shield,
  Crown,
  UserMinus,
  UserPlus,
  Sparkles,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useSocialStore } from '@/store/socialStore';
import { useUserStore } from '@/store/userStore';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

function safeTimeAgo(value: string | number | Date) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

function getInitials(name?: string) {
  const clean = String(name || 'User').trim();
  return clean.charAt(0).toUpperCase();
}

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
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  const circle = useMemo(
    () => circles.find((c) => c.id === (id || '')),
    [circles, id]
  );

  const messages = useMemo(
    () => (id && circleMessages[id] ? circleMessages[id] : []),
    [circleMessages, id]
  );

  const pinned = useMemo(
    () => messages.filter((message) => message.pinned),
    [messages]
  );

  const members = useMemo(
    () => (id && circleMembers[id] ? circleMembers[id] : []),
    [circleMembers, id]
  );

  useEffect(() => {
    if (circle?.description) {
      setDescriptionDraft(circle.description);
    }
  }, [circle?.id, circle?.description]);

  if (!circle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="flex pt-16">
          <LeftSidebar />

          <main className="flex-1 lg:ml-64">
            <div className="mx-auto max-w-4xl px-4 py-10">
              <Button
                variant="ghost"
                onClick={() => navigate('/communities')}
                className="mb-4 rounded-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communities
              </Button>

              <Card className="rounded-3xl border bg-card shadow-sm">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Circle not found.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isCreator = circle.creatorId === userId;
  const currentMember = members.find((member) => member.id === userId);
  const isMember = Boolean(circle.isMember || currentMember || isCreator);
  const canManageMembers = isCreator || currentMember?.role === 'admin';
  const memberCount = Math.max(circle.memberCount || 0, members.length || 0);

  const handleJoin = () => {
    joinCircle(circle.id);
  };

  const handleLeave = () => {
    leaveCircle(circle.id);
  };

  const handlePost = () => {
    const text = newMessage.trim();

    if (!text) return;

    if (!isMember) {
      joinCircle(circle.id);
      return;
    }

    postCircleMessage(circle.id, {
      authorId: userId,
      authorName: userName || 'You',
      text,
    });

    setNewMessage('');
  };

  const handleSaveDescription = async () => {
    const nextDescription = descriptionDraft.trim();

    if (!nextDescription || nextDescription === circle.description) return;

    setSavingDescription(true);

    try {
      updateCircle(circle.id, {
        description: nextDescription,
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const handleToggleVisibility = (isPrivate: boolean) => {
    updateCircle(circle.id, { isPrivate });
  };

  const handleReaction = (messageId: string) => {
    if (!isMember) {
      joinCircle(circle.id);
      return;
    }

    toggleReaction(circle.id, messageId, 'like', 1);
  };

  const handlePin = (messageId: string) => {
    if (!canManageMembers) return;
    togglePinCircleMessage(circle.id, messageId);
  };

  const coverImage =
    circle.coverImage ||
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex pt-16">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64">
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/communities')}
              className="mb-2 rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communities
            </Button>

            <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="relative h-44 w-full">
                <img
                  src={coverImage}
                  alt={circle.name}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-white/90 text-slate-900 hover:bg-white/90">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Circle
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="rounded-full bg-white/90 text-slate-900"
                      >
                        {circle.category}
                      </Badge>
                    </div>

                    <h1 className="truncate text-2xl font-semibold text-white">
                      {circle.name}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-100/90">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {memberCount.toLocaleString()} members
                      </span>

                      <span className="inline-flex items-center gap-1">
                        {circle.isPrivate ? (
                          <>
                            <Lock className="h-3 w-3" />
                            Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />
                            Public
                          </>
                        )}
                      </span>

                      {isCreator && (
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Creator
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white/95 text-slate-900 hover:bg-white"
                        onClick={handleLeave}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        onClick={handleJoin}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
              <div className="space-y-4">
                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">About this circle</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {circle.description}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Created by{' '}
                      <span className="font-medium text-foreground">
                        {circle.creatorName}
                      </span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>Channel</span>

                      {isMember ? (
                        <Badge variant="secondary" className="rounded-full">
                          Member access
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full">
                          Join to participate
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2 rounded-2xl border bg-background/60 p-3">
                      <Textarea
                        placeholder={
                          isMember
                            ? 'Share an update, question, idea or opportunity with this circle...'
                            : 'Join this circle to post and react.'
                        }
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        rows={3}
                        disabled={!isMember}
                        className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {isMember
                            ? 'Keep it useful, respectful and relevant to the circle.'
                            : 'Become a member to join the conversation.'}
                        </span>

                        {isMember ? (
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={!newMessage.trim()}
                            onClick={handlePost}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Post
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={handleJoin}
                          >
                            Join to post
                          </Button>
                        )}
                      </div>
                    </div>

                    {pinned.length > 0 && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                          <Pin className="h-3 w-3" />
                          Pinned updates
                        </div>

                        {pinned.map((message) => (
                          <div
                            key={`pinned-${message.id}`}
                            className="rounded-2xl border bg-background/80 px-3 py-2"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-medium">
                                {message.authorName}
                              </span>

                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {safeTimeAgo(message.createdAt)}
                              </span>
                            </div>

                            <p className="mb-2 whitespace-pre-wrap text-[13px] text-foreground">
                              {message.text}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 transition hover:bg-muted"
                                onClick={() => handleReaction(message.id)}
                              >
                                <span>👍</span>
                                <span>{message.reactions?.like ?? 0}</span>
                              </button>

                              {canManageMembers && (
                                <button
                                  type="button"
                                  className="ml-auto inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 transition hover:bg-muted"
                                  onClick={() => handlePin(message.id)}
                                >
                                  <PinOff className="h-3 w-3" />
                                  Unpin
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {messages.length === 0 ? (
                        <div className="rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
                          No channel posts yet.{' '}
                          {isMember
                            ? 'Start the first conversation.'
                            : 'Join the circle to participate.'}
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className="rounded-2xl border bg-background/60 px-3 py-2 text-xs"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-medium">
                                {message.authorName}
                              </span>

                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {safeTimeAgo(message.createdAt)}
                              </span>
                            </div>

                            <p className="mb-2 whitespace-pre-wrap text-[13px] text-foreground">
                              {message.text}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 transition hover:bg-muted"
                                onClick={() => handleReaction(message.id)}
                              >
                                <span>👍</span>
                                <span>{message.reactions?.like ?? 0}</span>
                              </button>

                              {canManageMembers && (
                                <button
                                  type="button"
                                  className="ml-auto inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 transition hover:bg-muted"
                                  onClick={() => handlePin(message.id)}
                                >
                                  {message.pinned ? (
                                    <>
                                      <PinOff className="h-3 w-3" />
                                      Unpin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-3 w-3" />
                                      Pin
                                    </>
                                  )}
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

              <div className="space-y-4">
                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4" />
                      Circle controls
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    {isCreator ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          As the creator, you can update the circle description
                          and visibility.
                        </p>

                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Description
                          </label>

                          <Textarea
                            value={descriptionDraft}
                            rows={4}
                            onChange={(event) =>
                              setDescriptionDraft(event.target.value)
                            }
                          />

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">
                              Use this to set the tone and purpose of the circle.
                            </p>

                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={
                                savingDescription ||
                                !descriptionDraft.trim() ||
                                descriptionDraft.trim() === circle.description
                              }
                              onClick={handleSaveDescription}
                            >
                              {savingDescription ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Visibility
                          </label>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'outline' : 'default'}
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleToggleVisibility(false)}
                            >
                              <Globe className="mr-1 h-3 w-3" />
                              Public
                            </Button>

                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'default' : 'outline'}
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleToggleVisibility(true)}
                            >
                              <Lock className="mr-1 h-3 w-3" />
                              Private
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Only the creator can manage this circle. Members can
                        participate in the channel and react to updates.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>Members</span>
                      <Badge variant="secondary" className="rounded-full">
                        {memberCount.toLocaleString()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    {members.length === 0 ? (
                      <p className="rounded-2xl border bg-background/60 p-3 text-muted-foreground">
                        No members loaded yet. This panel is local-only for now.
                      </p>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {members.map((member) => {
                          const isOwner = member.role === 'owner';
                          const isSelf = member.id === userId;
                          const canActOn =
                            canManageMembers && !isOwner && !isSelf;

                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-2 rounded-2xl border bg-background/60 px-2 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {member.avatar || avatar ? (
                                  <img
                                    src={member.avatar || avatar}
                                    alt={member.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                    {getInitials(member.name)}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="truncate text-[11px] font-medium">
                                      {member.name}
                                    </span>

                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {member.role}
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-muted-foreground">
                                    Joined {safeTimeAgo(member.joinedAt)}
                                  </p>
                                </div>
                              </div>

                              {canActOn && (
                                <div className="flex shrink-0 items-center gap-1">
                                  {member.role === 'member' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-[10px]"
                                      onClick={() =>
                                        updateCircleMemberRole(
                                          circle.id,
                                          member.id,
                                          'admin'
                                        )
                                      }
                                    >
                                      Promote
                                    </Button>
                                  )}

                                  {member.role === 'admin' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-[10px]"
                                      onClick={() =>
                                        updateCircleMemberRole(
                                          circle.id,
                                          member.id,
                                          'member'
                                        )
                                      }
                                    >
                                      Demote
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-full px-2 text-[10px] text-red-500 hover:text-red-600"
                                    onClick={() =>
                                      removeCircleMember(circle.id, member.id)
                                    }
                                  >
                                    <UserMinus className="h-3 w-3" />
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

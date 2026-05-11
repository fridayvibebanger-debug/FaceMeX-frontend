import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Search,
  Plus,
  MoreVertical,
  Image,
  Video,
  Mic,
  FileText,
  Camera,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
};

type Conversation = {
  userId: string;
  profile?: Profile | null;
  lastMessage: string;
  createdAt: string;
};

export default function MessagesPage() {
  const { userId } = useParams();
  const isChatOpen = !!userId;
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);
    };

    loadUser();
  }, []);

  const getProfileName = (profile?: Profile | null, fallbackId?: string) => {
    return (
      profile?.full_name ||
      profile?.name ||
      profile?.username ||
      `User ${String(fallbackId || '').slice(0, 6)}`
    );
  };

  const getProfileAvatar = (profile?: Profile | null) => {
    return profile?.avatar_url || profile?.avatar || null;
  };

  const loadConversations = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      alert(`Load conversations error: ${error.message}`);
      return;
    }

    const unique = new Map<string, Conversation>();

    (data || []).forEach((msg: Message) => {
      const otherUserId =
        msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;

      if (!unique.has(otherUserId)) {
        unique.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.deleted_at ? 'This message was deleted' : msg.content,
          createdAt: msg.created_at,
          profile: null,
        });
      }
    });

    const chats = Array.from(unique.values());
    const ids = chats.map((c) => c.userId);

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, name, username, avatar_url, avatar')
        .in('id', ids);

      const profileMap = new Map<string, Profile>();

      (profiles || []).forEach((p: Profile) => {
        profileMap.set(p.id, p);
      });

      setConversations(
        chats.map((chat) => ({
          ...chat,
          profile: profileMap.get(chat.userId) || null,
        }))
      );
    } else {
      setConversations([]);
    }
  };

  const loadMessages = async () => {
    if (!currentUserId || !userId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      alert(`Load messages error: ${error.message}`);
      return;
    }

    setMessages(data || []);
  };

  useEffect(() => {
    if (!isChatOpen) loadConversations();
  }, [currentUserId, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) loadMessages();
  }, [currentUserId, userId, isChatOpen]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          if (isChatOpen) loadMessages();
          else loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userId, isChatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const clean = text.trim();
    if (!clean || !currentUserId || !userId) return;

    setText('');

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: userId,
      content: clean,
    });

    if (error) {
      alert(`Message failed: ${error.message}`);
    }
  };

  const editMessage = async (messageId: string, nextContent: string) => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from('messages')
      .update({
        content: nextContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', currentUserId);

    if (error) {
      alert(`Edit failed: ${error.message}`);
      return;
    }

    loadMessages();
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUserId) return;

    const ok = confirm('Delete this message?');
    if (!ok) return;

    const { error } = await supabase
      .from('messages')
      .update({
        content: '',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', currentUserId);

    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }

    loadMessages();
  };

  const filteredConversations = conversations.filter((chat) => {
    const name = getProfileName(chat.profile, chat.userId).toLowerCase();
    return name.includes(searchText.toLowerCase());
  });

  if (!isChatOpen) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Messages</h1>

            <div className="flex items-center gap-2">
              <Button className="rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20">
                Archived
              </Button>

              <Button
                size="icon"
                className="rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
            <Search className="h-5 w-5 text-white/50" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="p-4 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
              No conversations yet.
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const avatar = getProfileAvatar(chat.profile);
              const name = getProfileName(chat.profile, chat.userId);

              return (
                <button
                  key={chat.userId}
                  onClick={() => navigate(`/messages/${chat.userId}`)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        name.slice(0, 1).toUpperCase()
                      )}

                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
                    </div>

                    <div>
                      <p className="font-bold">{name}</p>
                      <p className="max-w-[220px] truncate text-sm text-white/50">
                        {chat.lastMessage || 'No message yet'}
                      </p>
                    </div>
                  </div>

                  <MoreVertical className="h-5 w-5 text-white/40" />
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="sticky top-0 z-50 border-b border-fuchsia-500/20 bg-slate-950/95 px-4 py-3 backdrop-blur-xl shadow-[0_0_25px_rgba(168,85,247,0.25)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-500/25 to-cyan-400/30 shadow-[0_0_25px_rgba(168,85,247,0.45)]">
            <span className="font-bold text-white">
              {String(userId || 'U').slice(0, 1).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white">Chat</h1>
            <p className="truncate text-xs text-white/50">
              User {String(userId || '').slice(0, 8)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-28 space-y-3">
        {messages.map((msg) => {
          const mine = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  mine
                    ? 'max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)] break-words'
                    : 'max-w-[75%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/10 px-4 py-2 text-white break-words'
                }
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.deleted_at ? 'This message was deleted' : msg.content}
                </div>

                {msg.edited_at && !msg.deleted_at && (
                  <div className="mt-1 text-[10px] text-white/40">edited</div>
                )}

                <div className="mt-2 flex items-center gap-2 text-[11px] text-white/45">
                  <button
                    type="button"
                    onClick={() => alert('Translate coming soon')}
                    className="hover:text-white"
                  >
                    Translate
                  </button>

                  {mine && !msg.deleted_at && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const next = prompt('Edit message', msg.content);
                          if (next && next.trim()) {
                            editMessage(msg.id, next.trim());
                          }
                        }}
                        className="hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMessage(msg.id)}
                        className="text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 px-3 py-2 backdrop-blur-xl">
        {menuOpen && (
          <div className="absolute bottom-16 left-3 right-3 grid grid-cols-3 gap-2 rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-cyan-950/80 p-3 shadow-[0_0_25px_rgba(168,85,247,0.35)] backdrop-blur-xl">
            <Button className="rounded-2xl bg-white/10 text-white">
              <Image className="h-4 w-4 mr-1" /> Image
            </Button>
            <Button className="rounded-2xl bg-white/10 text-white">
              <Video className="h-4 w-4 mr-1" /> Video
            </Button>
            <Button className="rounded-2xl bg-white/10 text-white">
              <Mic className="h-4 w-4 mr-1" /> Voice
            </Button>
            <Button className="rounded-2xl bg-white/10 text-white">
              <FileText className="h-4 w-4 mr-1" /> File
            </Button>
            <Button className="rounded-2xl bg-white/10 text-white">
              <Camera className="h-4 w-4 mr-1" /> Camera
            </Button>
            <Button className="rounded-2xl bg-white/10 text-white">
              <Sparkles className="h-4 w-4 mr-1" /> AI
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-800/95 px-2 py-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-white"
              onClick={() => setMenuOpen((v) => !v)}
            >
              +
            </Button>

            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Message"
              className="h-10 flex-1 border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full bg-white text-slate-950 hover:bg-white/90 shadow-[0_0_20px_rgba(168,85,247,0.45)]"
            onClick={sendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Image, Video, FileText, Camera, Mic, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const { userId } = useParams();
  const isChatOpen = !!userId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const myId = user?.id;
  const loadConversations = async () => {
     if (!myId) return;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order('created_at', { ascending: false });

  if (error) {
    alert(`Load conversations error: ${error.message}`);
    return;
  }

  const unique = new Map();

  (data || []).forEach((msg) => {
    const otherUserId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;

    if (!unique.has(otherUserId)) {
      unique.set(otherUserId, {
        userId: otherUserId,
        lastMessage: msg.content,
        createdAt: msg.created_at,
      });
    }
  });

  setConversations(Array.from(unique.values()));
};
  const loadMessages = async () => {
    if (!myId || !userId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      alert(`Load messages error: ${error.message}`);
      return;
    }

    setMessages(data || []);
  };

  useEffect(() => {
    loadMessages();
  }, [myId, userId]);

  useEffect(() => {
    if (!myId || !userId) return;

    const channel = supabase
      .channel(`messages-${myId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as Message;

          const belongsToChat =
            (msg.sender_id === myId && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === myId);

          if (belongsToChat) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
useEffect(() => {
  if (!userId) {
    loadConversations();
  }
}, [myId, userId]);
  const sendMessage = async () => {
    const clean = text.trim();
    if (!clean || !myId || !userId) return;

    setText('');

    const { error } = await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: userId,
      content: clean,
    });

    if (error) {
      alert(`Message failed: ${error.message}`);
    }
  };
if (!isChatOpen) {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-white/50 text-sm mt-1">Your conversations</p>

      <div className="mt-6 space-y-3">
        {conversations.length === 0 ? (
          <div className="rounded-3xl border border-fuchsia-500/30 bg-white/5 p-6 text-center text-white/60">
            No conversations yet.
          </div>
        ) : (
          conversations.map((chat) => (
            <button
              key={chat.userId}
              onClick={() => navigate(`/messages/${chat.userId}`)}
              className="w-full rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-cyan-950/70 p-4 text-left text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
            >
              <p className="font-semibold">User {chat.userId.slice(0, 6)}</p>
              <p className="text-sm text-white/50 truncate">{chat.lastMessage}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="font-bold">Messages</h1>
          <p className="text-xs text-white/50">User ID: {userId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {messages.map((msg) => {
          const mine = msg.sender_id === myId;

          return (
            <div
              key={msg.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  mine
                    ? 'max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : 'max-w-[75%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/10 px-4 py-2 text-white'
                }
              >
               <div className="group relative">
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
                          if (next && next.trim()) editMessage(msg.id, next.trim());
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
            );
          })}

        <div ref={bottomRef} />
      </div>
     <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 px-3 py-2 backdrop-blur-xl">
        {menuOpen && (
          <div className="absolute bottom-16 left-3 right-3 grid grid-cols-3 gap-2 rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-cyan-950/80 p-3 shadow-[0_0_25px_rgba(168,85,247,0.35)] backdrop-blur-xl">
            <Button className="rounded-2xl bg-white/10 text-white">Image</Button>
            <Button className="rounded-2xl bg-white/10 text-white">Video</Button>
            <Button className="rounded-2xl bg-white/10 text-white">Voice</Button>
            <Button className="rounded-2xl bg-white/10 text-white">File</Button>
            <Button className="rounded-2xl bg-white/10 text-white">Camera</Button>
            <Button className="rounded-2xl bg-white/10 text-white">AI</Button>
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

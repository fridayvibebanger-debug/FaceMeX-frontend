import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { neonButton } from '@/styles';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
};

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const myId = user?.id;

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
      console.error('Load messages error:', error.message);
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
      console.error('Send message error:', error.message);
      alert(`Message failed: ${error.message}`);
    }
  };

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

    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  : 'max-w-[75%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-white border border-white/10'
              }
            >
              {msg.content}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>

    <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 p-3">
      <div className="flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-cyan-950/70 px-3 py-2 shadow-[0_0_25px_rgba(168,85,247,0.35)]">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
          onClick={() => alert('Add menu coming soon')}
        >
          +
        </Button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          placeholder="Write a message..."
          className="flex-1 border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          type="button"
          size="icon"
          className="h-10 w-10 rounded-full bg-white text-slate-950 hover:bg-white/90 shadow-[0_0_25px_rgba(168,85,247,0.45)]"
          onClick={sendMessage}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
); 
}

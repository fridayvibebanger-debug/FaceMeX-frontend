import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Plus,
  Image,
  Video,
  Mic,
  FileText,
  Camera,
  Sparkles,
  X,
} from 'lucide-react';
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
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
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
      alert(`Load messages error: ${error.message}`);
      return;
    }

    setMessages(data || []);
  };

 useEffect(() => {
  loadMessages();
}, [myId, userId]);

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  MoreVertical,
  Search,
  Plus,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Edit2,
  Check,
  CheckCheck,
  FileText,
  Pin,
  BellOff,
  Archive,
  CornerDownLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { api, API_URL } from '@/lib/api';
import { deepseekReply } from '@/utils/ai';
import { uploadMedia } from '@/lib/storage';
import { supabase } from '@/lib/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import CallModal from '@/components/calls/CallModal';
import { toast } from '@/components/ui/use-toast';
import { io, Socket } from 'socket.io-client';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import SafetyWarningDialog from '@/components/safety/SafetyWarningDialog';
import { reportSafetyEvent, safetyScanText, type SafetyScanResult } from '@/lib/safety';

type MessageType = 'text' | 'image' | 'document' | 'voice';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  is_active?: boolean | null;
};

type DbMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  created_at: string;
  is_read?: boolean | null;
  message_type?: MessageType | null;
  media_url?: string | null;
  file_name?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

type UiMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isRead: boolean;
  edited: boolean;
  deleted: boolean;
  mediaUrl?: string;
  fileName?: string;
};

type UiConversation = {
  id: string;
  type: 'dm';
  name: string;
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  }>;
  lastMessage?: UiMessage;
  unreadCount: number;
  isTyping?: string[];
};

function VoiceMessageBubble({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-full bg-slate-950/80 text-white border border-white/10 px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-xs font-semibold"
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/40"
              style={{ width: `${duration > 0 ? Math.min(100, (current / duration) * 100) : 0}%` }}
            />
          </div>

          <div className="mt-1 flex items-center gap-1 opacity-35">
            <div className="h-2 w-0.5 bg-white/70 rounded" />
            <div className="h-3 w-0.5 bg-white/70 rounded" />
            <div className="h-2 w-0.5 bg-white/70 rounded" />
            <div className="h-4 w-0.5 bg-white/70 rounded" />
            <div className="h-2 w-0.5 bg-white/70 rounded" />
            <div className="h-3 w-0.5 bg-white/70 rounded" />
            <div className="h-2 w-0.5 bg-white/70 rounded" />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (!a) return;
          setDuration(Number.isFinite(a.duration) ? a.duration : 0);
        }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a) return;
          setCurrent(a.currentTime || 0);
        }}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { tier, hasTier } = useUserStore();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<UiConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, UiMessage[]>>({});
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);
  const [safetyDialogScan, setSafetyDialogScan] = useState<SafetyScanResult | null>(null);
  const [pendingSendText, setPendingSendText] = useState<string | null>(null);
  const [incomingSafetyDialogOpen, setIncomingSafetyDialogOpen] = useState(false);
  const [incomingSafetyScan, setIncomingSafetyScan] = useState<SafetyScanResult | null>(null);
  const lastIncomingWarnedRef = useRef<string | null>(null);

  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);
  const [draftByConversation, setDraftByConversation] = useState<Record<string, string>>({});
  const [pinnedConversations, setPinnedConversations] = useState<Record<string, boolean>>({});
  const [mutedConversations, setMutedConversations] = useState<Record<string, boolean>>({});
  const [archivedConversations, setArchivedConversations] = useState<Record<string, boolean>>({});
  const [interactionByConversation, setInteractionByConversation] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [quickReplyFor, setQuickReplyFor] = useState<string | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [translatorAutoByConv, setTranslatorAutoByConv] = useState<Record<string, boolean>>({});
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});

  const [aiTyping, setAiTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);

  const canUseAI = hasTier('pro');
  const showAiSuggestion =
    canUseAI && !!messageText.trim() && !aiTyping && !aiDraftNotice && !aiSuggestionDismissed;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const [pendingVoiceBlob, setPendingVoiceBlob] = useState<Blob | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const ringingTimeoutRef = useRef<number | null>(null);
  const activeConversationRef = useRef<string | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConversation);
  const activeMessages = activeConversation ? messages[activeConversation] || [] : [];
  const translatorAuto = activeConversation ? !!translatorAutoByConv[activeConversation] : false;

  const getProfileName = (profile?: ProfileRow | null) =>
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    'FaceMeX Member';

  const getProfileAvatar = (profile?: ProfileRow | null) =>
    profile?.avatar_url || profile?.avatar || '';

  const mapSupabaseMessage = (m: DbMessage): UiMessage => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.deleted_at ? 'This message was deleted' : m.content || '',
    type: m.message_type || 'text',
    timestamp: new Date(m.created_at),
    isRead: !!m.is_read,
    edited: !!m.edited_at,
    deleted: !!m.deleted_at,
    mediaUrl: m.media_url || '',
    fileName: m.file_name || '',
  });

  const loadMessages = async (otherUserId: string) => {
    if (!currentUserId || !otherUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: 'Messages failed', description: error.message });
      return;
    }

    setMessages((prev) => ({
      ...prev,
      [otherUserId]: (data || []).map((row) => mapSupabaseMessage(row as DbMessage)),
    }));
  };

  const loadConversations = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Conversations failed', description: error.message });
      return;
    }

    const unique = new Map<string, DbMessage>();

    (data || []).forEach((raw) => {
      const msg = raw as DbMessage;
      const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;

      if (!unique.has(otherId)) {
        unique.set(otherId, msg);
      }
    });

    const ids = Array.from(unique.keys());
    let profiles: ProfileRow[] = [];

    if (ids.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, name, username, avatar_url, avatar, is_active')
        .in('id', ids);

      profiles = (profileRows || []) as ProfileRow[];
    }

    const profileMap = new Map<string, ProfileRow>();
    profiles.forEach((profile) => profileMap.set(profile.id, profile));

    const nextConversations: UiConversation[] = ids.map((otherId) => {
      const profile = profileMap.get(otherId);
      const name = getProfileName(profile, otherId);
      const avatar = getProfileAvatar(profile);
      const last = unique.get(otherId);

      return {
        id: otherId,
        type: 'dm',
        name,
        participants: [
          {
            id: otherId,
            name,
            avatar,
            isOnline: !!profile?.is_active,
          },
        ],
        lastMessage: last ? mapSupabaseMessage(last) : undefined,
        unreadCount: 0,
      };
    });

    setConversations(nextConversations);
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !userId) return;

    setActiveConversation(userId);
    loadMessages(userId);

    setConversations((prev) => {
      if (prev.some((conversation) => conversation.id === userId)) return prev;

      return [
        {
          id: userId,
          type: 'dm',
          name: 'FaceMeX Member',
          participants: [
            {
              id: userId,
              name: `User ${userId.slice(0, 6)}`,
              avatar: '',
              isOnline: false,
            },
          ],
          unreadCount: 0,
        },
        ...prev,
      ];
    });
  }, [currentUserId, userId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages-realtime-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const row = (payload.new || payload.old) as DbMessage | undefined;
          if (!row) return;

          const involvesMe = row.sender_id === currentUserId || row.receiver_id === currentUserId;
          if (!involvesMe) return;

          await loadConversations();

          if (activeConversationRef.current) {
            await loadMessages(activeConversationRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (activeConversation || conversations.length === 0) return;

    try {
      const isDesktop = typeof window !== 'undefined'
        ? window.matchMedia('(min-width: 768px)').matches
        : true;

      if (isDesktop) {
        setActiveConversation(conversations[0].id);
        loadMessages(conversations[0].id);
      }
    } catch {
      setActiveConversation(conversations[0].id);
      loadMessages(conversations[0].id);
    }
  }, [activeConversation, conversations]);

  useEffect(() => {
    if (!socketRef.current || !activeConversation) return;
    socketRef.current.emit('call:join', { roomId: activeConversation });
  }, [activeConversation]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('messages:drafts_v1');
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      setDraftByConversation(map && typeof map === 'object' ? map : {});
    } catch {
      setDraftByConversation({});
    }

    try {
      const raw = localStorage.getItem('messages:pinned_v1');
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const map: Record<string, boolean> = {};
      if (Array.isArray(list)) {
        list.forEach((id) => {
          if (typeof id === 'string' && id) map[id] = true;
        });
      }
      setPinnedConversations(map);
    } catch {
      setPinnedConversations({});
    }

    try {
      const raw = localStorage.getItem('messages:muted_v1');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      setMutedConversations(map && typeof map === 'object' ? map : {});
    } catch {
      setMutedConversations({});
    }

    try {
      const raw = localStorage.getItem('messages:archived_v1');
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const map: Record<string, boolean> = {};
      if (Array.isArray(list)) {
        list.forEach((id) => {
          if (typeof id === 'string' && id) map[id] = true;
        });
      }
      setArchivedConversations(map);
    } catch {
      setArchivedConversations({});
    }

    try {
      const raw = localStorage.getItem('messages:interaction_v1');
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      setInteractionByConversation(map && typeof map === 'object' ? map : {});
    } catch {
      setInteractionByConversation({});
    }
  }, []);

  const bumpInteraction = (conversationId: string, amount = 1) => {
    setInteractionByConversation((prev) => {
      const next = {
        ...prev,
        [conversationId]: Math.max(0, (prev[conversationId] || 0) + amount),
      };

      try {
        localStorage.setItem('messages:interaction_v1', JSON.stringify(next));
      } catch {}

      return next;
    });
  };

  useEffect(() => {
    if (!activeConversation) return;

    const text = messageText;

    setDraftByConversation((prev) => {
      const next = { ...prev };
      if (text.trim()) next[activeConversation] = text;
      else delete next[activeConversation];

      try {
        localStorage.setItem('messages:drafts_v1', JSON.stringify(next));
      } catch {}

      return next;
    });
  }, [messageText, activeConversation]);

  const togglePinConversation = (conversationId: string) => {
    setPinnedConversations((prev) => {
      const next = { ...prev, [conversationId]: !prev[conversationId] };
      if (!next[conversationId]) delete next[conversationId];

      try {
        const list = Object.keys(next).filter((key) => next[key]);
        localStorage.setItem('messages:pinned_v1', JSON.stringify(list));
      } catch {}

      return next;
    });
  };

  const toggleMuteConversation = (conversationId: string) => {
    setMutedConversations((prev) => {
      const next = { ...prev, [conversationId]: !prev[conversationId] };
      if (!next[conversationId]) delete next[conversationId];

      try {
        localStorage.setItem('messages:muted_v1', JSON.stringify(next));
      } catch {}

      return next;
    });
  };

  const toggleArchiveConversation = (conversationId: string) => {
    setArchivedConversations((prev) => {
      const next = { ...prev, [conversationId]: !prev[conversationId] };
      if (!next[conversationId]) delete next[conversationId];

      try {
        const list = Object.keys(next).filter((key) => next[key]);
        localStorage.setItem('messages:archived_v1', JSON.stringify(list));
      } catch {}

      return next;
    });
  };

  const clearDraft = (conversationId: string) => {
    setDraftByConversation((prev) => {
      const next = { ...prev };
      delete next[conversationId];

      try {
        localStorage.setItem('messages:drafts_v1', JSON.stringify(next));
      } catch {}

      return next;
    });

    if (activeConversation === conversationId) setMessageText('');
  };

  useEffect(() => {
    activeConversationRef.current = activeConversation || null;
  }, [activeConversation]);

  useEffect(() => {
    if (!API_URL) return;

    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('call:offer', async ({ offer, type }: { offer: any; type?: 'voice' | 'video' }) => {
      if (!activeConversationRef.current) return;

      try {
        setIncomingCall(true);
        setPendingOffer(offer);
        setIsCaller(false);
        setCallType(type || 'video');
      } catch (e) {
        console.error('Error handling call offer', e);
      }
    });

    socket.on('call:answer', async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setIsRinging(false);

        if (ringingTimeoutRef.current) {
          clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }
      } catch (e) {
        console.error('Error setting remote answer', e);
      }
    });

    socket.on('call:candidate', async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    });

    socket.on('call:end', () => {
      endCallInternal();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const endCallInternal = () => {
    setIsCallModalOpen(false);
    setIsCaller(false);
    setIsRinging(false);
    setIncomingCall(false);
    setPendingOffer(null);

    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        try {
          sender.track?.stop();
        } catch {}
      });

      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
  };

  const handleToggleRecording = async () => {
    if (!activeConversation) return;

    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        recordedChunksRef.current = [];
        const url = URL.createObjectURL(blob);

        setPendingVoiceBlob(blob);
        setPendingVoiceUrl((prev) => {
          if (prev) {
            try {
              URL.revokeObjectURL(prev);
            } catch {}
          }
          return url;
        });

        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting audio recording', e);
      toast({
        title: 'Mic permission needed',
        description: 'Allow microphone access to send voice notes.',
      });
    }
  };

  useEffect(() => {
    if (!isRecording) {
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingSeconds(0);
      return;
    }

    const t = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    recordingIntervalRef.current = t;

    return () => {
      window.clearInterval(t);
      if (recordingIntervalRef.current === t) recordingIntervalRef.current = null;
    };
  }, [isRecording]);

  const ensurePeerConnection = async (type: 'voice' | 'video') => {
    if (pcRef.current) return pcRef.current;

    const extraIceServers: RTCIceServer[] = [];
    const turnUrl = (import.meta as any).env?.VITE_TURN_URL as string | undefined;
    const turnUser = (import.meta as any).env?.VITE_TURN_USERNAME as string | undefined;
    const turnCred = (import.meta as any).env?.VITE_TURN_CREDENTIAL as string | undefined;

    if (turnUrl && turnUser && turnCred) {
      extraIceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...extraIceServers,
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && activeConversation && socketRef.current) {
        socketRef.current.emit('call:candidate', {
          roomId: activeConversation,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    pcRef.current = pc;

    if (!localStream) {
      const constraints = type === 'voice'
        ? { audio: true, video: false }
        : { audio: true, video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setLocalStream(stream);
    } else {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    return pc;
  };

  const sendSupabaseMessage = async (
    content: string,
    type: MessageType = 'text',
    extra: { mediaUrl?: string; fileName?: string } = {}
  ) => {
    if (!activeConversation || !currentUserId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: activeConversation,
      content,
      message_type: type,
      media_url: extra.mediaUrl || null,
      file_name: extra.fileName || null,
    });

    if (error) {
      toast({ title: 'Message failed', description: error.message });
      return;
    }

    await loadMessages(activeConversation);
    await loadConversations();
  };

  const sendTextWithBackendScan = async (text: string) => {
    if (!activeConversation) return;
    if (!text.trim()) return;

    setAiSuggestionDismissed(true);
    let blocked = false;

    try {
      try {
        await api.post('/api/safety/scan-message', {
          content: text,
          conversationId: activeConversation,
        });
      } catch (e: any) {
        const raw = String(e?.message || '');
        let msg = 'This message was blocked by safety filters.';

        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.message === 'string') msg = parsed.message;
        } catch {}

        if (raw.includes('403')) {
          setSafetyNotice(msg);
          blocked = true;
          return;
        }

        throw e;
      }

      if (blocked) return;
      await sendSupabaseMessage(text, 'text');
    } catch (e) {
      console.error('Error sending message', e);
      await sendSupabaseMessage(text, 'text');
    } finally {
      if (!blocked) setMessageText('');
    }
  };

  useEffect(() => {
    if (!messageText.trim()) {
      setAiSuggestionDismissed(false);
      return;
    }

    const t = window.setTimeout(() => {
      setAiSuggestionDismissed(true);
    }, 8000);

    return () => window.clearTimeout(t);
  }, [messageText]);

  const handleSendMessage = async () => {
    if (!activeConversation) {
      toast({ title: 'Select a conversation', description: 'Choose a chat to send a message.' });
      return;
    }

    if (editingMessageId) {
      const clean = messageText.trim();
      if (!clean) return;

      const { error } = await supabase
        .from('messages')
        .update({
          content: clean,
          edited_at: new Date().toISOString(),
        })
        .eq('id', editingMessageId)
        .eq('sender_id', currentUserId);

      if (error) {
        toast({ title: 'Edit failed', description: error.message });
        return;
      }

      setEditingMessageId(null);
      setMessageText('');
      await loadMessages(activeConversation);
      await loadConversations();
      return;
    }

    if (!messageText.trim() && pendingVoiceBlob) {
      const file = new File([pendingVoiceBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      try {
        const url = await uploadMedia(file, 'messages/voice');
        await sendSupabaseMessage(url, 'voice', { mediaUrl: url, fileName: file.name });
        setPendingVoiceBlob(null);
        setPendingVoiceUrl(null);
      } catch (e: any) {
        toast({
          title: 'Voice upload failed',
          description: e?.message || 'Could not upload voice note.',
        });
      }

      return;
    }

    if (!messageText.trim()) return;

    const scan = safetyScanText(messageText);

    if (scan.level === 'medium' || scan.level === 'high') {
      setPendingSendText(messageText);
      setSafetyDialogScan(scan);
      setSafetyDialogOpen(true);

      reportSafetyEvent({
        content: messageText,
        scan,
        context: { location: 'messages', conversationId: activeConversation, direction: 'outgoing' },
      }).catch(() => {});

      return;
    }

    await sendTextWithBackendScan(messageText);
  };

  useEffect(() => {
    if (!activeConversation) return;

    const incoming = [...activeMessages]
      .reverse()
      .find((m) => m.senderId !== currentUserId && m.type === 'text' && !!m.content);

    if (!incoming) return;
    if (lastIncomingWarnedRef.current === incoming.id) return;

    const scan = safetyScanText(incoming.content);

    if (scan.level === 'medium' || scan.level === 'high') {
      lastIncomingWarnedRef.current = incoming.id;
      setIncomingSafetyScan(scan);
      setIncomingSafetyDialogOpen(true);

      reportSafetyEvent({
        content: incoming.content,
        scan,
        context: { location: 'messages', conversationId: activeConversation, direction: 'incoming' },
      }).catch(() => {});
    }
  }, [activeConversation, activeMessages.length, currentUserId]);

  const handlePickImage = () => {
    if (isSendingAttachment) return;
    imageInputRef.current?.click();
  };

  const handlePickDocument = () => {
    if (isSendingAttachment) return;
    docInputRef.current?.click();
  };

  const handleSendImage = async (file: File) => {
    if (!activeConversation) return;
    setIsSendingAttachment(true);

    try {
      const url = await uploadMedia(file, 'messages/images');
      await sendSupabaseMessage(url, 'image', { mediaUrl: url, fileName: file.name });
    } catch (e: any) {
      toast({
        title: 'Upload failed',
        description: e?.message || 'Could not upload image',
        variant: 'destructive',
      });
    } finally {
      setIsSendingAttachment(false);
    }
  };

  const handleSendDocument = async (file: File) => {
    if (!activeConversation) return;
    setIsSendingAttachment(true);

    try {
      const url = await uploadMedia(file, 'messages/documents');
      await sendSupabaseMessage(url, 'document', { mediaUrl: url, fileName: file.name });
    } catch (e: any) {
      toast({
        title: 'Upload failed',
        description: e?.message || 'Could not upload document',
        variant: 'destructive',
      });
    } finally {
      setIsSendingAttachment(false);
    }
  };

  const translateMessage = async (id: string, text: string) => {
    if (!text) return;

    try {
      let targetLang = 'en';

      try {
        const stored = localStorage.getItem('settings:lang:primary');
        if (stored) targetLang = stored;
      } catch {}

      const res = await api.post('/api/ai/translate', {
        text,
        targetLang,
      }) as any;

      const translated = res?.translated || text;

      setTranslatedMessages((prev) => ({
        ...prev,
        [id]: translated,
      }));
    } catch {
      setTranslatedMessages((prev) => ({
        ...prev,
        [id]: 'Translation unavailable right now.',
      }));
    }
  };

  const aiSuggest = async () => {
    if (!hasTier('pro')) {
      toast({
        title: 'Upgrade needed',
        description: 'AI Reply is available on Pro and above.',
      });
      return;
    }

    const dailyLimit = 30;
    const todayKey = new Date().toISOString().slice(0, 10);
    let used = 0;

    try {
      const raw = localStorage.getItem(`dm:ai:${todayKey}`);
      if (raw) used = parseInt(raw, 10) || 0;
    } catch {}

    if (used >= dailyLimit) {
      toast({
        title: 'AI limit reached for today',
        description: 'You can use AI Reply again tomorrow.',
      });
      return;
    }

    const lastIncoming = [...activeMessages].reverse().find((m) => m.senderId !== currentUserId);
    const base = lastIncoming?.content || 'Draft a friendly, concise, positive reply.';
    const input = `You are replying in a private chat. Write like a real human: warm, natural, and easy to read. Keep it short (ideally 1–4 sentences, never more than about 270 words). Avoid lists and headings.

Last message you are replying to:
"${base}"`;

    setAiTyping(true);

    try {
      const suggestion = await deepseekReply(input);
      setMessageText(suggestion);
      setAiDraftNotice('Draft ready. Review, edit, then send.');
      window.setTimeout(() => messageInputRef.current?.focus(), 0);

      try {
        localStorage.setItem(`dm:ai:${todayKey}`, String(used + 1));
      } catch {}
    } catch {
      toast({ title: 'AI reply unavailable', description: 'Try again in a moment.' });
    } finally {
      setAiTyping(false);
    }
  };

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!activeConversation || !socketRef.current) return;

    try {
      setCallType(type);
      setIsCaller(true);
      const socket = socketRef.current;
      socket.emit('call:join', { roomId: activeConversation });
      const pc = await ensurePeerConnection(type);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { roomId: activeConversation, offer, type });
      setIsCallModalOpen(true);
      setIsRinging(true);

      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = window.setTimeout(() => {
        endCallInternal();
      }, 20000);
    } catch (e) {
      console.error('Error starting call', e);
      toast({
        title: 'Call failed',
        description: 'Could not start the call. Check camera/mic permissions.',
      });
      endCallInternal();
    }
  };

  const handleAcceptIncomingCall = async () => {
    if (!activeConversation || !socketRef.current || !pendingOffer) return;

    try {
      const socket = socketRef.current;
      await ensurePeerConnection(callType);
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));

      if (!localStream) {
        const constraints = callType === 'voice'
          ? { audio: true, video: false }
          : { audio: true, video: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        setLocalStream(stream);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { roomId: activeConversation, answer });

      setIsCallModalOpen(true);
      setIncomingCall(false);
      setPendingOffer(null);
    } catch (e) {
      console.error('Error accepting call', e);
      setIncomingCall(false);
      setPendingOffer(null);
    }
  };

  const handleDeclineIncomingCall = () => {
    if (activeConversation && socketRef.current) {
      socketRef.current.emit('call:end', { roomId: activeConversation });
    }
    setIncomingCall(false);
    setPendingOffer(null);
  };

  const handleToggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  const handleToggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  const getConversationName = (conv: UiConversation) => conv.name || 'Unknown';

  const getConversationAvatar = (conv: UiConversation) => conv.participants[0]?.avatar || '';

  const getLastPreview = (conv: UiConversation) => {
    const draft = draftByConversation[conv.id];
    if (typeof draft === 'string' && draft.trim()) return `Draft: ${draft.trim()}`;
    const msg = conv.lastMessage;
    if (!msg) return '';
    if (conv.isTyping && conv.isTyping.length > 0) return 'typing…';
    if (msg.type === 'image') return 'Photo';
    if (msg.type === 'document') return msg.fileName ? `Document • ${msg.fileName}` : 'Document';
    if (msg.type === 'voice') return 'Voice note';
    return msg.content || '';
  };

  const getLastTimeLabel = (conv: UiConversation) => {
    const msg = conv.lastMessage;
    if (!msg?.timestamp) return '';
    try {
      return formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getReadReceipt = (conv: UiConversation) => {
    const msg = conv.lastMessage;
    if (!msg) return null;
    if (msg.senderId !== currentUserId) return null;
    return msg.isRead ? { label: 'Seen', icon: CheckCheck } : { label: 'Delivered', icon: Check };
  };

  const getSmartSortKey = (conv: UiConversation) => {
    const pinned = pinnedConversations[conv.id] ? 1 : 0;
    const unread = (conv.unreadCount || 0) > 0 ? 1 : 0;
    const interaction = interactionByConversation[conv.id] || 0;
    const t = conv.lastMessage?.timestamp ? new Date(conv.lastMessage.timestamp).getTime() : 0;
    return pinned * 1_000_000_000 + unread * 10_000_000 + interaction * 10_000 + Math.floor(t / 1000);
  };

  const openConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);
    bumpInteraction(conversationId, 3);
    setQuickReplyFor(null);
    setQuickReplyText('');
  };

  const handleQuickReplySend = async (conversationId: string) => {
    const text = quickReplyText.trim();
    if (!text || !currentUserId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: conversationId,
      content: text,
      message_type: 'text',
    });

    if (error) {
      toast({ title: 'Quick reply failed', description: error.message });
      return;
    }

    bumpInteraction(conversationId, 2);
    setQuickReplyText('');
    setQuickReplyFor(null);
    await loadConversations();
    if (activeConversation === conversationId) await loadMessages(conversationId);
    toast({ title: 'Sent', description: 'Quick reply delivered.' });
  };

  const getDmParticipant = () => {
    if (!activeConv || activeConv.type !== 'dm') return null;
    return activeConv.participants?.[0] || null;
  };

  const handleViewProfile = () => {
    const p = getDmParticipant();
    if (!p) {
      toast({
        title: 'Not available',
        description: 'Profile view is only available for direct messages right now.',
      });
      return;
    }
    navigate(`/profile/${p.id}`);
  };

  const handleMuteFromMenu = () => {
    if (!activeConversation) return;
    const willMute = !mutedConversations[activeConversation];
    toggleMuteConversation(activeConversation);
    toast({
      title: willMute ? 'Muted' : 'Unmuted',
      description: 'Notification preference updated for this conversation.',
    });
  };

  const handleDeleteConversation = () => {
    if (!activeConversation) return;
    const ok = window.confirm('Archive this conversation?');
    if (!ok) return;

    toggleArchiveConversation(activeConversation);
    setActiveConversation(null);
    toast({ title: 'Archived', description: 'Conversation moved to archive.' });
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.type === 'dm' ? conv.participants[0]?.name : conv.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <SafetyWarningDialog
        open={safetyDialogOpen}
        onOpenChange={setSafetyDialogOpen}
        title="Potential scam or unsafe request"
        scan={safetyDialogScan}
        primaryActionLabel="Send anyway"
        onPrimaryAction={() => {
          const text = pendingSendText;
          setSafetyDialogOpen(false);
          setPendingSendText(null);
          if (!text) return;
          sendTextWithBackendScan(text);
        }}
      />

      <SafetyWarningDialog
        open={incomingSafetyDialogOpen}
        onOpenChange={setIncomingSafetyDialogOpen}
        title="Safety warning"
        scan={incomingSafetyScan}
        primaryActionLabel="Ok"
        onPrimaryAction={() => setIncomingSafetyDialogOpen(false)}
      />

      <Navbar />

      <div className="pt-14 md:pt-16 pb-16 md:pb-0 min-h-screen flex">
        <div
          className={`w-full md:w-[340px] md:shrink-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border-r flex flex-col ${
            activeConv ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3 md:p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-xl font-semibold">Messages</h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowArchived((v) => !v)}
                >
                  {showArchived ? 'Hide archived' : 'Archived'}
                </Button>
                <Button size="icon" variant="ghost">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>

            <div className="hidden md:flex flex-wrap gap-2 text-[11px]">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => navigate('/jobs')}
              >
                Jobs
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => navigate('/groups/pro')}
              >
                Pro Groups
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 pl-3 md:pl-4">
              {[...filteredConversations]
                .filter((c) => (showArchived ? true : !archivedConversations[c.id]))
                .sort((a, b) => getSmartSortKey(b) - getSmartSortKey(a))
                .map((conv) => (
                  <motion.div
                    key={conv.id}
                    className="relative"
                    whileHover={{ scale: 1.002 }}
                    whileTap={{ scale: 0.998 }}
                  >
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className="h-full w-full flex items-stretch">
                        <div className="w-1/2 bg-muted/25 flex items-center justify-start px-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                            <Pin className="h-4 w-4" />
                            {pinnedConversations[conv.id] ? 'Unpin' : 'Pin'}
                          </div>
                        </div>
                        <div className="w-1/2 bg-muted/20 flex items-center justify-end px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                              <BellOff className="h-4 w-4" />
                              {mutedConversations[conv.id] ? 'Unmute' : 'Mute'}
                            </div>
                            <div className="h-6 w-px bg-slate-400/30" />
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                              <Archive className="h-4 w-4" />
                              {archivedConversations[conv.id] ? 'Unarchive' : 'Archive'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.15}
                      onClick={() => openConversation(conv.id)}
                      onDragEnd={(_, info) => {
                        const x = info.offset.x;
                        if (x > 90) {
                          togglePinConversation(conv.id);
                          toast({
                            title: pinnedConversations[conv.id] ? 'Unpinned' : 'Pinned',
                            description: 'Updated chat priority.',
                          });
                          return;
                        }
                        if (x < -140) {
                          toggleArchiveConversation(conv.id);
                          toast({
                            title: archivedConversations[conv.id] ? 'Unarchived' : 'Archived',
                            description: 'Chat moved.',
                          });
                          return;
                        }
                        if (x < -70) {
                          toggleMuteConversation(conv.id);
                          toast({
                            title: mutedConversations[conv.id] ? 'Unmuted' : 'Muted',
                            description: 'Notification preference updated.',
                          });
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 pr-11 rounded-2xl transition-colors border relative ${
                        activeConversation === conv.id
                          ? 'bg-muted/60 border-border/60'
                          : 'bg-background hover:bg-muted/40 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {getConversationAvatar(conv) ? (
                            <img
                              src={getConversationAvatar(conv)}
                              alt={getConversationName(conv)}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground/70">
                              {getConversationName(conv)?.charAt(0)}
                            </div>
                          )}
                          {conv.type === 'dm' && conv.participants[0]?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
                          )}
                          {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                {pinnedConversations[conv.id] && (
                                  <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                {mutedConversations[conv.id] && (
                                  <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                                <p className="font-semibold text-sm md:text-base truncate">
                                  {getConversationName(conv)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="hidden sm:inline text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {getLastTimeLabel(conv)}
                              </span>
                              {conv.unreadCount > 0 && (
                                <Badge className="bg-primary/15 text-foreground h-5 px-2 rounded-full text-[10px]">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              {!draftByConversation[conv.id]?.trim() && conv.lastMessage?.type === 'image' && (
                                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {!draftByConversation[conv.id]?.trim() && conv.lastMessage?.type === 'document' && (
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {!draftByConversation[conv.id]?.trim() && conv.lastMessage?.type === 'voice' && (
                                <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {draftByConversation[conv.id]?.trim() && (
                                <Edit2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              )}
                              <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {getLastPreview(conv)}
                              </p>
                            </div>

                            {(() => {
                              const rr = getReadReceipt(conv);
                              if (!rr) return null;
                              const Icon = rr.icon;
                              return (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <Icon className="h-3 w-3" />
                                  {rr.label}
                                </span>
                              );
                            })()}
                          </div>

                          {quickReplyFor === conv.id && (
                            <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={quickReplyText}
                                onChange={(e) => setQuickReplyText(e.target.value)}
                                placeholder="Quick reply…"
                                className="h-8 text-xs"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickReplySend(conv.id);
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setQuickReplyFor(null);
                                    setQuickReplyText('');
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuickReplySend(conv.id)}
                                disabled={!quickReplyText.trim()}
                                aria-label="Send quick reply"
                              >
                                <CornerDownLeft className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-7 w-7 rounded-full hover:bg-muted/50 inline-flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              aria-label="Conversation actions"
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinConversation(conv.id);
                              }}
                            >
                              {pinnedConversations[conv.id] ? 'Unpin' : 'Pin to top'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMuteConversation(conv.id);
                              }}
                            >
                              {mutedConversations[conv.id] ? 'Unmute' : 'Mute'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchiveConversation(conv.id);
                              }}
                            >
                              {archivedConversations[conv.id] ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickReplyFor(conv.id);
                                setQuickReplyText('');
                              }}
                            >
                              Quick reply
                            </DropdownMenuItem>
                            {draftByConversation[conv.id]?.trim() && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearDraft(conv.id);
                                }}
                              >
                                Clear draft
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
            </div>
          </ScrollArea>
        </div>

        <div className={`flex-1 flex flex-col bg-background ${activeConv ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 w-full flex flex-col">
            <SensitiveContentShield context="messages">
              {activeConv ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-8 w-8"
                        onClick={() => setActiveConversation(null)}
                        aria-label="Back"
                      >
                        <span className="text-lg">←</span>
                      </Button>
                      <div>
                        <p className="font-semibold text-sm md:text-base">{getConversationName(activeConv)}</p>
                        <p className="text-xs text-muted-foreground">
                          {activeConv.participants[0]?.isOnline ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('/jobs')}>Jobs</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/groups/pro')}>Pro Groups</DropdownMenuItem>
                          {(tier === 'exclusive' || tier === 'business') ? (
                            <DropdownMenuItem
                              onClick={() => {
                                if (!activeConversation) return;
                                setTranslatorAutoByConv((prev) => ({
                                  ...prev,
                                  [activeConversation]: !translatorAuto,
                                }));
                              }}
                            >
                              {translatorAuto ? 'Translator: On' : 'Translator: Off'}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={handleViewProfile}>View Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={handleMuteFromMenu}>
                            {activeConversation && mutedConversations[activeConversation] ? 'Unmute Notifications' : 'Mute Notifications'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={handleDeleteConversation}>
                            Archive Conversation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {incomingCall && (
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Incoming {callType} call</p>
                        <p className="text-xs text-muted-foreground">
                          {getConversationName(activeConv)} is calling you.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleDeclineIncomingCall}>
                          Decline
                        </Button>
                        <Button size="sm" onClick={handleAcceptIncomingCall}>
                          Accept
                        </Button>
                      </div>
                    </div>
                  )}

                  <ScrollArea className="flex-1 p-3 md:p-4">
                    <div className="w-full max-w-4xl space-y-4 md:ml-0 md:mr-auto">
                      <AnimatePresence>
                        {activeMessages.map((message) => {
                          const isOwn = message.senderId === currentUserId;
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex items-end space-x-2 max-w-[82%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                <div>
                                  <div
                                    className={`rounded-3xl px-3 py-2.5 ${
                                      message.type === 'voice'
                                        ? 'bg-transparent text-foreground p-0'
                                        : isOwn
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted/40 text-foreground'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1">
                                        {message.type === 'voice' && (message.mediaUrl || message.content) ? (
                                          <VoiceMessageBubble src={message.mediaUrl || message.content} />
                                        ) : message.type === 'image' && (message.mediaUrl || message.content) ? (
                                          <a href={message.mediaUrl || message.content} target="_blank" rel="noreferrer" className="block">
                                            <img
                                              src={message.mediaUrl || message.content}
                                              alt={message.fileName || 'Image'}
                                              className="max-h-64 w-auto rounded-2xl border border-white/15"
                                              loading="lazy"
                                            />
                                          </a>
                                        ) : message.type === 'document' && (message.mediaUrl || message.content) ? (
                                          <a
                                            href={message.mediaUrl || message.content}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 border ${
                                              isOwn
                                                ? 'border-white/20 bg-white/10'
                                                : 'border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/30'
                                            }`}
                                          >
                                            <Paperclip className="h-4 w-4" />
                                            <span className="text-sm underline">
                                              {message.fileName || 'Document'}
                                            </span>
                                          </a>
                                        ) : (
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                                        )}
                                        {message.edited && (
                                          <p className="mt-1 text-[10px] opacity-75">edited</p>
                                        )}
                                      </div>
                                      {isOwn && !message.deleted && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className={
                                                message.type === 'voice'
                                                  ? 'h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                                  : 'h-7 w-7 -mr-1 -mt-1 text-white/90 hover:text-white hover:bg-white/15'
                                              }
                                              aria-label="Message actions"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              disabled={message.type === 'voice'}
                                              onClick={() => {
                                                setEditingMessageId(message.id);
                                                setMessageText(message.content);
                                              }}
                                            >
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-red-500"
                                              onClick={async () => {
                                                if (!activeConversation || !currentUserId) return;
                                                if (!window.confirm('Delete this message for you?')) return;

                                                const { error } = await supabase
                                                  .from('messages')
                                                  .update({
                                                    content: '',
                                                    deleted_at: new Date().toISOString(),
                                                  })
                                                  .eq('id', message.id)
                                                  .eq('sender_id', currentUserId);

                                                if (error) {
                                                  toast({ title: 'Delete failed', description: error.message });
                                                  return;
                                                }

                                                await loadMessages(activeConversation);
                                                await loadConversations();
                                              }}
                                            >
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </div>

                                  {translatedMessages[message.id] && (
                                    <p className={`mt-1 text-xs text-muted-foreground ${isOwn ? 'text-right' : ''}`}>
                                      {translatedMessages[message.id]}
                                    </p>
                                  )}
                                  {translatorAuto && !isOwn && !translatedMessages[message.id] && (
                                    <button
                                      className={`mt-1 text-[11px] underline text-muted-foreground hover:text-foreground ${isOwn ? 'ml-auto' : ''}`}
                                      type="button"
                                      onClick={() => translateMessage(message.id, message.content)}
                                    >
                                      Auto-translate preview
                                    </button>
                                  )}
                                  {!translatorAuto && !translatedMessages[message.id] && (
                                    <button
                                      className={`mt-1 text-[11px] underline text-muted-foreground hover:text-foreground ${isOwn ? 'ml-auto' : ''}`}
                                      type="button"
                                      onClick={() => translateMessage(message.id, message.content)}
                                    >
                                      Translate
                                    </button>
                                  )}
                                  <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                                    {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                      <div className="h-[calc(env(safe-area-inset-bottom)+92px)]" />
                    </div>
                  </ScrollArea>

                  <div className="fixed bottom-0 left-0 right-0 md:left-[calc(340px+1px)] z-40 bg-background/95 backdrop-blur border-t p-3 md:p-4 pb-[calc(env(safe-area-inset-bottom)+4px)] md:pb-4">
                    <div className="w-full max-w-4xl md:ml-0 md:mr-auto">
                      {aiDraftNotice ? (
                        <div className="mb-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                          <div className="font-medium">Suggested reply ready</div>
                          <div className="mt-0.5 text-muted-foreground leading-relaxed">{aiDraftNotice}</div>
                        </div>
                      ) : null}
                      {showAiSuggestion ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                          <div className="text-muted-foreground">Get a suggested reply (quiet, professional tone).</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={aiTyping}
                            onClick={() => {
                              setAiSuggestionDismissed(true);
                              aiSuggest();
                            }}
                          >
                            Suggest
                          </Button>
                        </div>
                      ) : null}
                      {safetyNotice ? (
                        <div className="mb-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                          <div className="font-medium">Message not sent</div>
                          <div className="mt-0.5 text-muted-foreground leading-relaxed">{safetyNotice}</div>
                        </div>
                      ) : null}
                      {pendingVoiceUrl && !isRecording ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <VoiceMessageBubble src={pendingVoiceUrl} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              onClick={() => {
                                setPendingVoiceUrl((prev) => {
                                  if (prev) {
                                    try { URL.revokeObjectURL(prev); } catch {}
                                  }
                                  return null;
                                });
                                setPendingVoiceBlob(null);
                              }}
                            >
                              Undo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              disabled={!activeConversation}
                              onClick={handleSendMessage}
                            >
                              Send
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {isRecording ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                          <div className="text-muted-foreground">
                            Recording · {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={handleToggleRecording}
                            disabled={!activeConversation}
                          >
                            Stop
                          </Button>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border/60 bg-muted/20 px-2.5 py-2.5 flex items-end gap-1.5">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSendImage(f);
                            e.currentTarget.value = '';
                          }}
                        />
                        <input
                          ref={docInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSendDocument(f);
                            e.currentTarget.value = '';
                          }}
                        />

                        <Drawer open={plusOpen} onOpenChange={setPlusOpen}>
                          <DrawerTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-9 w-9 rounded-full"
                              disabled={!activeConversation || isSendingAttachment}
                              aria-label="Add"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent className="rounded-t-[18px]">
                            <DrawerHeader>
                              <DrawerTitle>More</DrawerTitle>
                            </DrawerHeader>
                            <div className="px-4 pb-4 space-y-2">
                              <DrawerClose asChild>
                                <Button type="button" variant="outline" className="w-full justify-start" onClick={handlePickImage}>
                                  Attach image
                                </Button>
                              </DrawerClose>
                              <DrawerClose asChild>
                                <Button type="button" variant="outline" className="w-full justify-start" onClick={handlePickDocument}>
                                  Attach document
                                </Button>
                              </DrawerClose>
                              <DrawerClose asChild>
                                <Button type="button" variant="outline" className="w-full justify-start" onClick={handleToggleRecording} disabled={!activeConversation}>
                                  {isRecording ? 'Stop voice note' : 'Record voice note'}
                                </Button>
                              </DrawerClose>
                              <div className="pt-1" />
                              <DrawerClose asChild>
                                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => handleStartCall('voice')}>
                                  Start call
                                </Button>
                              </DrawerClose>
                              <DrawerClose asChild>
                                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => handleStartCall('video')}>
                                  Start video call
                                </Button>
                              </DrawerClose>
                            </div>
                          </DrawerContent>
                        </Drawer>

                        <textarea
                          ref={messageInputRef}
                          placeholder={editingMessageId ? 'Edit message…' : 'Type a message…'}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none min-h-[44px] max-h-40"
                          disabled={!activeConversation}
                        />

                        <Button
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={!activeConversation || isSendingAttachment || ((!messageText.trim() && !editingMessageId) && !pendingVoiceUrl)}
                          aria-label="Send"
                          className="h-9 w-9"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Select a conversation to start messaging.
                </div>
              )}
            </SensitiveContentShield>
          </div>
        </div>

        {activeConv && (
          <CallModal
            open={isCallModalOpen}
            onOpenChange={setIsCallModalOpen}
            type={callType}
            participant={{
              name: getConversationName(activeConv),
              avatar: getConversationAvatar(activeConv),
            }}
            localStream={localStream}
            remoteStream={remoteStream}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onEnd={() => {
              if (activeConversation && socketRef.current) {
                socketRef.current.emit('call:end', { roomId: activeConversation });
              }
              endCallInternal();
            }}
          />
        )}
      </div>
    </div>
  );
}


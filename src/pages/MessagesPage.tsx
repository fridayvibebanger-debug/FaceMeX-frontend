import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, MoreVertical, Search, Plus, 
  Image as ImageIcon, Mic, Smile, Paperclip, MessageCircle, ThumbsUp, ThumbsDown,
  Edit2, Trash2, Sparkles, Check, CheckCheck, FileText, Pin, BellOff, Archive, CornerDownLeft,
} from 'lucide-react';
import { useMessageStore } from '@/store/messageStore';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { api, API_URL } from '@/lib/api';
import { deepseekReply } from '@/utils/ai';
import { uploadMedia } from '@/lib/storage';
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
      audio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setPlaying(false);
      });
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
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    sendMessage,
    receiveMessage,
    deleteMessage,
    updateMessage,
    deleteConversation,
  } = useMessageStore();

  const navigate = useNavigate();
  const { tier, hasTier } = useUserStore();

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
  const [echoOn, setEchoOn] = useState(false);
  const [echoSummary, setEchoSummary] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [translatorAutoByConv, setTranslatorAutoByConv] = useState<Record<string, boolean>>({});
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});

  const setEchoPersisted = (convId: string, value: boolean) => {
    try {
      const raw = localStorage.getItem('messages:echo');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      map[convId] = value;
      localStorage.setItem('messages:echo', JSON.stringify(map));
    } catch {}
  };

  const [aiTyping, setAiTyping] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const canUseAI = hasTier('pro');
  const showAiSuggestion =
    canUseAI && !!messageText.trim() && !aiTyping && !aiDraftNotice && !aiSuggestionDismissed;

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

      // If blocked, keep draft in the textarea.
      if (blocked) {
        return;
      }
      sendMessage(activeConversation, text, 'text', {});
    } catch (e) {
      console.error('Error sending message', e);
      // If safety backend is unavailable, still send in demo mode.
      try {
        sendMessage(activeConversation, text, 'text', {});
      } catch {}
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

  // Persist Echo toggle per conversation
  useEffect(() => {
    try {
      const raw = localStorage.getItem('messages:echo');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      if (activeConversation && typeof map[activeConversation] === 'boolean') {
        setEchoOn(map[activeConversation]);
      } else {
        setEchoOn(false);
      }

      const rawS = localStorage.getItem('messages:echo:summary');
      const mapS = rawS ? (JSON.parse(rawS) as Record<string, string>) : {};
      if (activeConversation && typeof mapS[activeConversation] === 'string') {
        setEchoSummary(mapS[activeConversation]);
      } else {
        setEchoSummary('');
      }
    } catch {
      setEchoOn(false);
      setEchoSummary('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    recordingIntervalRef.current = t;

    return () => {
      window.clearInterval(t);
      if (recordingIntervalRef.current === t) recordingIntervalRef.current = null;
    };
  }, [isRecording]);

  // WebRTC / Call state
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState<boolean>(false);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const ringingTimeoutRef = useRef<number | null>(null);

  const activeConversationRef = useRef<string | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConversation);
  const activeMessages = activeConversation ? messages[activeConversation] || [] : [];
  const translatorAuto = activeConversation ? !!translatorAutoByConv[activeConversation] : false;

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.type === 'group' 
      ? conv.name 
      : conv.participants[0]?.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (activeConversation || conversations.length === 0) return;
    // On mobile, start on the conversations list (don't auto-open the first chat).
    // On desktop, auto-open the first conversation for convenience.
    try {
      const isDesktop = typeof window !== 'undefined'
        ? window.matchMedia('(min-width: 768px)').matches
        : true;
      if (isDesktop) setActiveConversation(conversations[0].id);
    } catch {
      setActiveConversation(conversations[0].id);
    }
  }, [activeConversation, conversations, setActiveConversation]);

  // Join the call signaling room for the active conversation
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageText]);

  const togglePinConversation = (conversationId: string) => {
    setPinnedConversations((prev) => {
      const next = { ...prev, [conversationId]: !prev[conversationId] };
      if (!next[conversationId]) delete next[conversationId];
      try {
        const list = Object.keys(next).filter((k) => next[k]);
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
        const list = Object.keys(next).filter((k) => next[k]);
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

  // Keep a ref of the current active conversation id for socket handlers.
  useEffect(() => {
    activeConversationRef.current = activeConversation || null;
  }, [activeConversation]);

  // Setup Socket.io for calls (separate from Navbar notifications)
  useEffect(() => {
    if (!API_URL) return;
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('call:offer', async ({ offer, type }: { offer: any; type?: 'voice' | 'video' }) => {
      if (!activeConversationRef.current) return;
      try {
        // Store incoming offer and show incoming call banner.
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
        // Call has been answered, stop ringing state.
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
      // If we were the caller and still ringing, treat as declined/missed.
      if (isCaller && isRinging && activeConversation) {
        sendMessage(activeConversation, 'Call was declined or missed.', 'text', {});
      }
      endCallInternal();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleRecording = async () => {
    if (!activeConversation) return;

    // Stop recording
    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        recordedChunksRef.current = [];
        const url = URL.createObjectURL(blob);

        // Hold a local preview so the user can undo before sending.
        setPendingVoiceUrl((prev) => {
          if (prev) {
            try { URL.revokeObjectURL(prev); } catch {}
          }
          return url;
        });

        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting audio recording', e);
      toast({ title: 'Mic permission needed', description: 'Allow microphone access to send voice notes.' });
    }
  };

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

    // Get local media
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
        try { sender.track?.stop(); } catch {}
      });
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => t.stop());
      setRemoteStream(null);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversation) {
      toast({ title: 'Select a conversation', description: 'Choose a chat to send a message.' });
      return;
    }
    if (!messageText.trim() && pendingVoiceUrl) {
      sendMessage(activeConversation, pendingVoiceUrl, 'voice', {});
      setPendingVoiceUrl(null);
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
    const incoming = [...activeMessages].reverse().find((m) => m.senderId !== '1' && m.type === 'text' && !!m.content);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation, activeMessages.length]);

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
      sendMessage(activeConversation, '', 'image', { mediaUrl: url, fileName: file.name });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Could not upload image', variant: 'destructive' });
    } finally {
      setIsSendingAttachment(false);
    }
  };

  const handleSendDocument = async (file: File) => {
    if (!activeConversation) return;
    setIsSendingAttachment(true);
    try {
      const url = await uploadMedia(file, 'messages/documents');
      sendMessage(activeConversation, '', 'document', { mediaUrl: url, fileName: file.name });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Could not upload document', variant: 'destructive' });
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
    // Pro+ gating
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

    const lastIncoming = [...activeMessages].reverse().find(m => m.senderId !== '1');
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
        const nextUsed = used + 1;
        localStorage.setItem(`dm:ai:${todayKey}`, String(nextUsed));
      } catch {}
    } catch (e) {
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

      // Auto-timeout for missed calls (e.g., 20 seconds).
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
      }
      ringingTimeoutRef.current = window.setTimeout(() => {
        if (isCaller && activeConversation) {
          sendMessage(activeConversation, 'Missed call (no answer).', 'text');
          if (socketRef.current) {
            socketRef.current.emit('call:end', { roomId: activeConversation });
          }
        }
        endCallInternal();
      }, 20000);
    } catch (e) {
      console.error('Error starting call', e);
      toast({ title: 'Call failed', description: 'Could not start the call. Check camera/mic permissions.' });
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

      // Ensure we have local media attached.
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

  const computeSummary = () => {
    if (!activeMessages || activeMessages.length === 0) {
      setEchoSummary('No messages yet. Start chatting to see summaries.');
      try {
        if (activeConversation) {
          const rawS = localStorage.getItem('messages:echo:summary');
          const mapS = rawS ? JSON.parse(rawS) as Record<string, string> : {};
          mapS[activeConversation] = 'No messages yet. Start chatting to see summaries.';
          localStorage.setItem('messages:echo:summary', JSON.stringify(mapS));
        }
      } catch {}
      return;
    }
    const last = activeMessages.slice(-10);
    const total = last.length;
    const yours = last.filter((m) => m.senderId === '1').length;
    const words = last.reduce((acc, m) => acc + (m.content?.split(/\s+/).length || 0), 0);
    const summary = `Last ${total} msgs · You: ${yours} · Others: ${total - yours} · ~${Math.round(words / total)} words/msg. Key themes: engagement, updates, follow-ups.`;
    setEchoSummary(summary);
    try {
      if (activeConversation) {
        const rawS = localStorage.getItem('messages:echo:summary');
        const mapS = rawS ? JSON.parse(rawS) as Record<string, string> : {};
        mapS[activeConversation] = summary;
        localStorage.setItem('messages:echo:summary', JSON.stringify(mapS));
      }
    } catch {}
  };

  const getConversationName = (conv: typeof conversations[0]) => {
    if (conv.type === 'group') return conv.name;
    return conv.participants[0]?.name || 'Unknown';
  };

  const getConversationAvatar = (conv: typeof conversations[0]) => {
    if (conv.type === 'group') {
      return conv.participants[0]?.avatar || '';
    }
    return conv.participants[0]?.avatar || '';
  };

  const getLastPreview = (conv: typeof conversations[0]) => {
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

  const getEchoRecapSnippet = (conversationId: string) => {
    try {
      const rawS = localStorage.getItem('messages:echo:summary');
      const mapS = rawS ? JSON.parse(rawS) as Record<string, string> : {};
      const summary = mapS?.[conversationId];
      if (typeof summary !== 'string' || !summary.trim()) return '';
      return summary.trim();
    } catch {
      return '';
    }
  };

  const getLastTimeLabel = (conv: typeof conversations[0]) => {
    const msg = conv.lastMessage;
    if (!msg?.timestamp) return '';
    try {
      return formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getReadReceipt = (conv: typeof conversations[0]) => {
    const msg = conv.lastMessage;
    if (!msg) return null;
    if (msg.senderId !== '1') return null;
    return msg.isRead ? { label: 'Seen', icon: CheckCheck } : { label: 'Delivered', icon: Check };
  };

  const getSmartSortKey = (conv: typeof conversations[0]) => {
    const pinned = pinnedConversations[conv.id] ? 1 : 0;
    const unread = (conv.unreadCount || 0) > 0 ? 1 : 0;
    const interaction = interactionByConversation[conv.id] || 0;
    const t = conv.lastMessage?.timestamp ? new Date(conv.lastMessage.timestamp).getTime() : 0;
    return pinned * 1_000_000_000 + unread * 10_000_000 + interaction * 10_000 + Math.floor(t / 1000);
  };

  const openConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    bumpInteraction(conversationId, 3);
    setQuickReplyFor(null);
    setQuickReplyText('');
  };

  const handleQuickReplySend = (conversationId: string) => {
    const text = quickReplyText.trim();
    if (!text) return;
    sendMessage(conversationId, text, 'text', {});
    bumpInteraction(conversationId, 2);
    setQuickReplyText('');
    setQuickReplyFor(null);
    toast({ title: 'Sent', description: 'Quick reply delivered.' });
  };

  const simulateIncoming = () => {
    if (!activeConversation || !activeConv) return;
    const text = `Hello from ${getConversationName(activeConv)} • ${new Date().toLocaleTimeString()}`;
    receiveMessage(activeConversation, text);
    toast({ title: 'Simulated incoming', description: 'Injected a mock message from contact.' });
  };

  const getDmParticipant = () => {
    if (!activeConv || activeConv.type !== 'dm') return null;
    return activeConv.participants?.[0] || null;
  };

  const handleViewProfile = () => {
    const p = getDmParticipant();
    if (!p) {
      toast({ title: 'Not available', description: 'Profile view is only available for direct messages right now.' });
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
    const ok = window.confirm('Delete this conversation? This will remove it from your device.');
    if (!ok) return;
    deleteConversation(activeConversation);
    toast({ title: 'Deleted', description: 'Conversation removed.' });
  };

  const sendQuickReaction = (emoji: string) => {
    if (!activeConversation) return;
    sendMessage(activeConversation, emoji, 'text', {});
  };

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
        {/* Conversations List */}
        <div
          className={`w-full md:w-[340px] md:shrink-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border-r flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}
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
                        toast({ title: pinnedConversations[conv.id] ? 'Unpinned' : 'Pinned', description: 'Updated chat priority.' });
                        return;
                      }
                      if (x < -140) {
                        toggleArchiveConversation(conv.id);
                        toast({ title: archivedConversations[conv.id] ? 'Unarchived' : 'Archived', description: 'Chat moved.' });
                        return;
                      }
                      if (x < -70) {
                        toggleMuteConversation(conv.id);
                        toast({ title: mutedConversations[conv.id] ? 'Unmuted' : 'Muted', description: 'Notification preference updated.' });
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
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground/70">
                          {getConversationName(conv)?.charAt(0)}
                        </div>
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
                              <p className="font-semibold text-sm truncate">{getConversationName(conv)}</p>
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

                        {(() => {
                          const recap = getEchoRecapSnippet(conv.id);
                          if (!recap) return null;
                          return (
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">
                              Echo recap: {recap}
                            </div>
                          );
                        })()}

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

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-background ${activeConv ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 w-full flex flex-col">
            <SensitiveContentShield context="messages">
            {activeConv ? (
              <>
                {/* Chat Header */}
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
                      {activeConv.type === 'group' ? (
                        <p className="text-xs text-muted-foreground">
                          {activeConv.participants.length} members
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {activeConv.participants[0]?.isOnline ? 'Active now' : 'Offline'}
                        </p>
                      )}
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
                        <DropdownMenuItem
                          onClick={() => {
                            const next = !echoOn;
                            setEchoOn(next);
                            if (activeConversation) setEchoPersisted(activeConversation, next);
                            if (next) computeSummary();
                          }}
                        >
                          {echoOn ? 'Summary: On' : 'Summary: Off'}
                        </DropdownMenuItem>
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
                        <DropdownMenuItem onClick={simulateIncoming}>Simulate incoming</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleViewProfile}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleMuteFromMenu}>
                          {activeConversation && mutedConversations[activeConversation] ? 'Unmute Notifications' : 'Mute Notifications'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={handleDeleteConversation}>
                          Delete Conversation
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

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 md:p-4">
                  <div className="w-full max-w-4xl space-y-4 md:ml-0 md:mr-auto">
                    {echoOn && (
                      <div className="p-3 rounded-lg border bg-card text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold">Conversation summary</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={computeSummary}>Summarize</Button>
                            <Button size="sm" variant="ghost" onClick={()=> setEchoOn(false)}>Hide</Button>
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          {echoSummary || 'Quick insights about the latest conversation will appear here.'}
                        </div>
                      </div>
                    )}
                    <AnimatePresence>
                      {activeMessages.map((message) => {
                        const isOwn = message.senderId === '1';
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
                                      {message.type === 'voice' && message.content ? (
                                        <VoiceMessageBubble src={message.content} />
                                      ) : message.type === 'image' && (message.mediaUrl || message.content) ? (
                                        <a
                                          href={message.mediaUrl || message.content}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block"
                                        >
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
                                    {isOwn && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className={
                                              message.type === 'voice'
                                                ? 'h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                                : isOwn
                                                  ? 'h-7 w-7 -mr-1 -mt-1 text-white/90 hover:text-white hover:bg-white/15'
                                                  : 'h-7 w-7 -mr-1 -mt-1'
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
                                            onClick={() => {
                                              if (!activeConversation) return;
                                              if (window.confirm('Delete this message for you?')) {
                                                if (message.type === 'voice' && typeof message.content === 'string' && message.content.startsWith('blob:')) {
                                                  try { URL.revokeObjectURL(message.content); } catch {}
                                                }
                                                deleteMessage(activeConversation, message.id);
                                              }
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
                                    onClick={() => {
                                      translateMessage(message.id, message.content);
                                    }}
                                  >
                                    Auto-translate preview
                                  </button>
                                )}
                                {!translatorAuto && !translatedMessages[message.id] && (
                                  <button
                                    className={`mt-1 text-[11px] underline text-muted-foreground hover:text-foreground ${isOwn ? 'ml-auto' : ''}`}
                                    type="button"
                                    onClick={() => {
                                      translateMessage(message.id, message.content);
                                    }}
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

                {/* Message Input */}
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
                            }}
                          >
                            Undo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={!activeConversation}
                            onClick={() => {
                              if (!activeConversation || !pendingVoiceUrl) return;
                              sendMessage(activeConversation, pendingVoiceUrl, 'voice', {});
                              setPendingVoiceUrl(null);
                            }}
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

        {/* Call Modal */}
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
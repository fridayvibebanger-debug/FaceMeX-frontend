import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Participant, Room, RoomEvent, Track } from 'livekit-client';
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Users,
  UserCheck,
  UserRoundX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabaseClient';
import { SEO_SITE_ORIGIN } from '@/lib/seo';
import {
  screenShareRequest,
  type ShareParticipant,
  type ShareSession,
  type ShareToken,
} from '@/lib/screenShareApi';

type MeetingMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: number;
};

type MeetingParticipant = {
  id: string;
  name: string;
  microphoneEnabled: boolean;
  speaking: boolean;
  presenting: boolean;
  isHost: boolean;
  local: boolean;
};

type ScreenQuality = 'auto' | 'standard' | 'high';
const CHAT_TOPIC = 'facemex-meeting-chat';
const MAX_CHAT_MESSAGE_LENGTH = 1000;

function getScreenEncoding(quality: ScreenQuality) {
  if (quality === 'standard') return { maxBitrate: 2_500_000, maxFramerate: 15 };
  if (quality === 'high') return { maxBitrate: 8_000_000, maxFramerate: 30 };
  return { maxBitrate: 5_000_000, maxFramerate: 30 };
}

function getScreenCaptureError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return 'Screen sharing was cancelled or permission was denied. You can try again whenever you are ready.';
    }
    if (error.name === 'NotReadableError') {
      return 'Your browser could not access the selected screen. Close other capture tools and try again.';
    }
  }
  return error instanceof Error ? error.message : 'Could not start screen sharing. Please try again.';
}

function getMicrophoneError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Microphone permission was denied. Allow microphone access in your browser settings and try again.';
    }
    if (error.name === 'NotFoundError') {
      return 'No microphone was found. Connect a microphone and try again.';
    }
    if (error.name === 'NotReadableError') {
      return 'Your microphone could not be opened. Check that another app is not using it, then try again.';
    }
  }
  return 'Could not change the microphone state. Check your microphone and browser permissions, then try again.';
}

function getInvitationUrl() {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1') {
    return new URL(
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      SEO_SITE_ORIGIN
    ).toString();
  }
  return currentUrl.toString();
}

export default function ScreenSharePage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [session, setSession] = useState<ShareSession | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [guestName, setGuestName] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<Track | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitationShared, setInvitationShared] = useState(false);
  const [frameSentToWorkspace, setFrameSentToWorkspace] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatMessages, setChatMessages] = useState<MeetingMessage[]>([]);
  const [meetingParticipants, setMeetingParticipants] = useState<MeetingParticipant[]>([]);
  const activeSpeakerIdsRef = useRef<string[]>([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>('auto');
  const [fitToWindow, setFitToWindow] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [stageFullscreen, setStageFullscreen] = useState(false);
  const panelCloseButtonRef = useRef<HTMLButtonElement>(null);
  const panelTriggerRef = useRef<HTMLElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef(false);
  const stoppingRef = useRef(false);
  const mountedRef = useRef(false);
  const hostStreamingRef = useRef(false);
  const remoteAudioElementsRef = useRef(new Map<Track, HTMLMediaElement>());

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const result = await screenShareRequest<{ session: ShareSession }>('get', { sessionId });
    setSession(result.session);
    setSessionError('');
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stoppingRef.current = true;
      const stream = localStreamRef.current;
      localStreamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (hostStreamingRef.current && sessionId) {
        void screenShareRequest('pause', { sessionId }).catch((error: unknown) => {
          console.error('FaceMeX could not pause sharing during page cleanup', error);
        });
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const elements = [document.documentElement, document.body, document.getElementById('root')].filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    );
    const originalStyles = elements.map((element) => ({
      element,
      overflow: element.style.overflow,
      height: element.style.height,
      minHeight: element.style.minHeight,
    }));

    elements.forEach((element) => {
      element.style.overflow = 'hidden';
      element.style.height = '100dvh';
      element.style.minHeight = '0';
    });

    return () => {
      originalStyles.forEach(({ element, overflow, height, minHeight }) => {
        element.style.overflow = overflow;
        element.style.height = height;
        element.style.minHeight = minHeight;
      });
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !isInitialized || !isAuthenticated) {
      setSession(null);
      setSessionError('');
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const result = await screenShareRequest<{ session: ShareSession }>('get', { sessionId });
        if (active) {
          setSession(result.session);
          setSessionError('');
        }
      } catch (error) {
        if (active) {
          setSessionError(error instanceof Error ? error.message : 'Could not load this sharing session.');
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 3_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [sessionId, isAuthenticated, isInitialized]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteTrack) return;
    remoteTrack.attach(video);
    return () => {
      remoteTrack.detach(video);
      video.srcObject = null;
    };
  }, [remoteTrack]);

  useEffect(() => {
    const updateDuration = () => {
      const startedAt = session?.startedAt ? new Date(session.startedAt).getTime() : 0;
      setMeetingDuration(startedAt && session?.status === 'active'
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        : 0);
    };
    updateDuration();
    const interval = window.setInterval(updateDuration, 1000);
    return () => window.clearInterval(interval);
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    const updateFullscreen = () => setStageFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    if (!participantsOpen && !chatOpen) {
      panelTriggerRef.current?.focus();
      return;
    }
    panelCloseButtonRef.current?.focus();

    const handlePanelKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setParticipantsOpen(false);
        setChatOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = document.getElementById(chatOpen ? 'screen-share-chat' : 'screen-share-participants');
      const focusable = panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handlePanelKeyDown);
    return () => {
      document.removeEventListener('keydown', handlePanelKeyDown);
    };
  }, [participantsOpen, chatOpen]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages.length, chatOpen]);

  const updateRoomParticipants = (room: Room, speakingIds = activeSpeakerIdsRef.current) => {
    const participants: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
    setMeetingParticipants(participants.map((participant) => ({
      id: participant.identity,
      name: participant.name?.trim() || 'FaceMeX participant',
      microphoneEnabled: participant.isMicrophoneEnabled,
      speaking: speakingIds.includes(participant.identity),
      presenting: participant.isScreenShareEnabled,
      isHost: participant.attributes.facemex_role === 'host',
      local: participant.isLocal,
    })));
  };

  const receiveMeetingMessage = (
    payload: Uint8Array,
    participant?: Participant,
    topic?: string
  ) => {
    if (!mountedRef.current || topic !== CHAT_TOPIC || !participant || payload.byteLength > 8_000) return;
    try {
      const decoded: unknown = JSON.parse(new TextDecoder().decode(payload));
      if (!decoded || typeof decoded !== 'object') return;
      const message = decoded as { id?: unknown; content?: unknown; sentAt?: unknown };
      if (
        typeof message.id !== 'string' ||
        typeof message.content !== 'string' ||
        typeof message.sentAt !== 'number' ||
        !Number.isFinite(message.sentAt) ||
        message.sentAt < 0 ||
        message.sentAt > Date.now() + 60_000 ||
        message.id.length > 80
      ) return;
      const content = message.content.trim();
      if (!content || content.length > MAX_CHAT_MESSAGE_LENGTH) return;
      setChatMessages((previous) => {
        if (previous.some((item) => item.id === message.id)) return previous;
        return [...previous, {
          id: message.id as string,
          senderId: participant.identity,
          senderName: participant.name?.trim() || 'FaceMeX participant',
          content,
          sentAt: message.sentAt as number,
        }].slice(-200);
      });
      setChatError('');
    } catch (error) {
      console.error('FaceMeX ignored an invalid in-meeting message', error);
    }
  };

  const connectRoom = async (publishTrack?: MediaStreamTrack) => {
    if (!sessionId) throw new Error('This sharing link is missing its session ID.');
    if (roomRef.current) {
      if (publishTrack) {
        await roomRef.current.localParticipant.publishTrack(publishTrack, {
          source: Track.Source.ScreenShare,
          screenShareEncoding: getScreenEncoding(screenQuality),
          degradationPreference: 'maintain-resolution',
          simulcast: false,
        });
      }
      return roomRef.current;
    }
    const { url, token } = await screenShareRequest<ShareToken>('token', { sessionId });
    const room = new Room({ adaptiveStream: true, dynacast: true });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare && mountedRef.current) {
        setRemoteTrack(track);
      }
      if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
        const element = track.attach();
        element.autoplay = true;
        element.setAttribute('playsinline', '');
        audioContainerRef.current.appendChild(element);
        remoteAudioElementsRef.current.set(track, element);
        void element.play().catch((error: unknown) => {
          console.warn('FaceMeX could not autoplay meeting audio; user interaction may be required.', error);
        });
      }
      updateRoomParticipants(room);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) setRemoteTrack(null);
      const audioElement = remoteAudioElementsRef.current.get(track);
      if (audioElement) {
        track.detach(audioElement);
        audioElement.remove();
        remoteAudioElementsRef.current.delete(track);
      }
      updateRoomParticipants(room);
    });
    room.on(RoomEvent.TrackPublished, () => updateRoomParticipants(room));
    room.on(RoomEvent.TrackUnpublished, () => updateRoomParticipants(room));
    room.on(RoomEvent.TrackMuted, () => updateRoomParticipants(room));
    room.on(RoomEvent.TrackUnmuted, () => updateRoomParticipants(room));
    room.on(RoomEvent.ParticipantConnected, () => updateRoomParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, () => updateRoomParticipants(room));
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = speakers.map((speaker) => speaker.identity);
      activeSpeakerIdsRef.current = ids;
      updateRoomParticipants(room, ids);
    });
    room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      receiveMeetingMessage(payload, participant, topic);
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (mountedRef.current) setConnectionStatus('Reconnecting…');
    });
    room.on(RoomEvent.Reconnected, () => {
      if (mountedRef.current) setConnectionStatus('Connected');
      updateRoomParticipants(room);
    });
    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current === room) {
        roomRef.current = null;
        activeSpeakerIdsRef.current = [];
        setMicrophoneEnabled(false);
        remoteAudioElementsRef.current.forEach((element) => element.remove());
        remoteAudioElementsRef.current.clear();
      }
      if (mountedRef.current) {
        setRemoteTrack(null);
        setMeetingParticipants([]);
        setConnectionStatus('Disconnected');
      }
    });

    try {
      await room.connect(url, token);
      roomRef.current = room;
      if (publishTrack) {
        await room.localParticipant.publishTrack(publishTrack, {
          source: Track.Source.ScreenShare,
          screenShareEncoding: getScreenEncoding(screenQuality),
          degradationPreference: 'maintain-resolution',
          simulcast: false,
        });
      }
      setConnectionStatus('Connected');
      updateRoomParticipants(room);
      return room;
    } catch (error) {
      if (roomRef.current === room) roomRef.current = null;
      room.disconnect();
      throw error;
    }
  };

  useEffect(() => {
    const shouldReconnectHost =
      session?.role === 'host' &&
      session.status === 'active' &&
      !session.hostConnected &&
      Boolean(localStream);
    if (!shouldReconnectHost || roomRef.current || connectingRef.current) return;

    const screenTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!screenTrack || screenTrack.readyState !== 'live') return;

    let active = true;
    connectingRef.current = true;
    setConnectionStatus('Reconnecting host…');
    void connectRoom(screenTrack)
      .then(() => {
        if (active) setConnectionStatus('Sharing live');
      })
      .catch((error: unknown) => {
        if (active) {
          setActionError(error instanceof Error ? error.message : 'Could not reconnect the shared screen.');
          setConnectionStatus('Connection failed');
        }
      })
      .finally(() => {
        connectingRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [
    session?.id,
    session?.role,
    session?.status,
    session?.hostConnected,
    connectionStatus,
    localStream,
  ]);

  useEffect(() => {
    if (
      session?.role === 'visitor' &&
      session.participantStatus !== 'approved' &&
      roomRef.current
    ) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setRemoteTrack(null);
      setConnectionStatus('Not connected');
    }
  }, [session?.role, session?.participantStatus]);

  useEffect(() => {
    if (!/expired|ended|revoked/i.test(sessionError)) return;
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRemoteTrack(null);
    setConnectionStatus('Session unavailable');
  }, [sessionError]);

  const createSession = async () => {
    setBusyAction('create');
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>('create');
      navigate(`/screen-share/${result.session.id}`, { replace: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not create a private session.');
    } finally {
      setBusyAction('');
    }
  };

  const joinMeeting = async () => {
    if (!sessionId || !session) return;
    if (connectingRef.current) return;
    connectingRef.current = true;
    setBusyAction('join');
    setActionError('');
    setConnectionStatus('Connecting…');
    let startedSession = false;
    try {
      if (session.role === 'host' && session.status !== 'active') {
        const result = await screenShareRequest<{ session: ShareSession }>('start', { sessionId });
        setSession(result.session);
        startedSession = true;
      }
      await connectRoom();
      setConnectionStatus('Connected');
      if (session.role === 'host') hostStreamingRef.current = true;
      try {
        await refreshSession();
      } catch (error) {
        console.error('FaceMeX joined the meeting but could not refresh its session details', error);
        setActionError('You joined the meeting, but some meeting details could not be refreshed.');
      }
    } catch (error) {
      if (startedSession && !roomRef.current) {
        try {
          await screenShareRequest('pause', { sessionId });
        } catch (pauseError) {
          console.error('FaceMeX could not close a room after host connection failed', pauseError);
        }
      }
      setConnectionStatus('Connection failed');
      setActionError(error instanceof Error ? error.message : 'Could not join this meeting. Check your connection and try again.');
    } finally {
      connectingRef.current = false;
      setBusyAction('');
    }
  };

  const changeScreenQuality = async (quality: ScreenQuality) => {
    if (quality === screenQuality) return;
    const room = roomRef.current;
    const screenTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!room || !screenTrack || screenTrack.readyState !== 'live') {
      setScreenQuality(quality);
      return;
    }

    setBusyAction('quality');
    setActionError('');
    try {
      await room.localParticipant.unpublishTrack(screenTrack, false);
      try {
        await room.localParticipant.publishTrack(screenTrack, {
          source: Track.Source.ScreenShare,
          screenShareEncoding: getScreenEncoding(quality),
          degradationPreference: 'maintain-resolution',
          simulcast: false,
        });
        setScreenQuality(quality);
      } catch (publishError) {
        try {
          await room.localParticipant.publishTrack(screenTrack, {
            source: Track.Source.ScreenShare,
            screenShareEncoding: getScreenEncoding(screenQuality),
            degradationPreference: 'maintain-resolution',
            simulcast: false,
          });
        } catch (restoreError) {
          console.error('FaceMeX could not restore the previous screen-share encoding', restoreError);
          await stopSharing();
        }
        throw publishError;
      }
    } catch (error) {
      setActionError(error instanceof Error ? `Could not apply screen quality: ${error.message}` : 'Could not apply screen quality.');
    } finally {
      setBusyAction('');
    }
  };

  const toggleMicrophone = async () => {
    const room = roomRef.current;
    if (!room) {
      setActionError('Join the meeting before turning on your microphone.');
      return;
    }
    setMicrophoneBusy(true);
    setActionError('');
    try {
      const enabled = !room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(enabled, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      setMicrophoneEnabled(enabled);
      updateRoomParticipants(room);
    } catch (error) {
      setActionError(getMicrophoneError(error));
    } finally {
      setMicrophoneBusy(false);
    }
  };

  const sendMeetingMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const room = roomRef.current;
    const content = chatDraft.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!room || !content) {
      if (!room) setChatError('Join the meeting before sending a message.');
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      content,
      sentAt: Date.now(),
    };
    setChatError('');
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(message)),
        { reliable: true, topic: CHAT_TOPIC }
      );
      setChatMessages((previous) => [...previous, {
        ...message,
        senderId: room.localParticipant.identity,
        senderName: room.localParticipant.name?.trim() || 'You',
      }].slice(-200));
      setChatDraft('');
    } catch (error) {
      console.error('FaceMeX could not send a meeting chat message', error);
      setChatError('Message could not be sent. Check your connection and try again.');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageRef.current?.requestFullscreen();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Fullscreen mode is unavailable in this browser.');
    }
  };

  const runHostAction = async (action: 'approve' | 'reject' | 'remove' | 'start' | 'pause' | 'end', participantId?: string) => {
    if (!sessionId) return;
    setBusyAction(participantId ? `${action}:${participantId}` : action);
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>(action, {
        sessionId,
        ...(participantId ? { participantId } : {}),
      });
      setSession(result.session);
      setSessionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Could not ${action} the session.`);
    } finally {
      setBusyAction('');
    }
  };

  const stopLocalMedia = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    let disconnectError: unknown;
    try {
      if (room) await room.disconnect();
    } catch (error) {
      disconnectError = error;
    } finally {
      remoteAudioElementsRef.current.forEach((element) => element.remove());
      remoteAudioElementsRef.current.clear();
      stream?.getTracks().forEach((track) => track.stop());
    }
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteTrack(null);
      setMeetingParticipants([]);
      activeSpeakerIdsRef.current = [];
      setMicrophoneEnabled(false);
    }
    if (disconnectError) throw disconnectError;
  };

  const stopSharing = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setActionError('');
    let unpublishError: unknown;
    try {
      const stream = localStreamRef.current;
      const screenTrack = stream?.getVideoTracks()[0];
      if (screenTrack && roomRef.current) {
        try {
          await roomRef.current.localParticipant.unpublishTrack(screenTrack);
        } catch (error) {
          unpublishError = error;
          const room = roomRef.current;
          roomRef.current = null;
          try {
            await room?.disconnect();
          } catch (disconnectError) {
            console.error('FaceMeX could not disconnect after screen unpublish failed', disconnectError);
          }
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      hostStreamingRef.current = Boolean(roomRef.current);
      setConnectionStatus(roomRef.current ? 'Connected' : 'Not connected');
      if (unpublishError) {
        try {
          await screenShareRequest('pause', { sessionId });
          hostStreamingRef.current = false;
        } catch (pauseError) {
          console.error('FaceMeX stopped local capture but could not pause the server session', pauseError);
        }
        setActionError('Screen capture stopped, but the live track could not be cleanly unpublished. The meeting was disconnected as a safety measure.');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not safely stop sharing.');
    } finally {
      stoppingRef.current = false;
    }
  };

  const startSharing = async () => {
    if (!sessionId) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
      setActionError('Live screen capture is unavailable in this browser or context. Use a supported desktop browser over HTTPS.');
      return;
    }
    if (localStreamRef.current?.getVideoTracks().some((track) => track.readyState === 'live')) {
      setActionError('A screen is already being shared. Stop the current share before starting another.');
      return;
    }

    setBusyAction('start');
    setActionError('');
    let stream: MediaStream | null = null;
    let sessionStarted = false;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('The browser did not provide a screen video track.');
      videoTrack.contentHint = 'text';
      localStreamRef.current = stream;
      setLocalStream(stream);

      if (session?.status !== 'active') {
        const started = await screenShareRequest<{ session: ShareSession }>('start', { sessionId });
        setSession(started.session);
        sessionStarted = true;
      }
      await connectRoom(videoTrack);
      if (videoTrack.readyState === 'ended') {
        await stopSharing();
        return;
      }
      videoTrack.addEventListener('ended', () => void stopSharing(), { once: true });
      hostStreamingRef.current = true;
      setConnectionStatus('Sharing live');
      await refreshSession();
    } catch (error) {
      if (stream) {
        localStreamRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
      }
      roomRef.current?.disconnect();
      roomRef.current = null;
      setLocalStream(null);
      setConnectionStatus('Not connected');
      if (sessionStarted && !roomRef.current) {
        try {
          await screenShareRequest('pause', { sessionId });
        } catch (pauseError) {
          console.error('FaceMeX could not close a room after screen capture failed', pauseError);
        }
      }
      setActionError(getScreenCaptureError(error));
    } finally {
      setBusyAction('');
    }
  };

  const requestAccess = async () => {
    if (!sessionId) return;
    setBusyAction('request');
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>('request', { sessionId });
      setSession(result.session);
      setSessionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not request access.');
    } finally {
      setBusyAction('');
    }
  };

  const joinAsGuest = async () => {
    if (!sessionId) return;
    const displayName = guestName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
    if (!displayName) {
      setActionError('Enter the name you want other meeting participants to see.');
      return;
    }
    setBusyAction('guest-request');
    setActionError('');
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: displayName } },
      });
      if (error) {
        const errorCode = error.code || 'guest_sign_in_failed';
        console.error('FaceMeX could not create an authenticated guest identity', { code: errorCode });
        throw new Error(errorCode === 'anonymous_provider_disabled'
          ? 'Guest sign-in is disabled. Enable Anonymous Sign-Ins in the Supabase Auth settings, or sign in to FaceMeX.'
          : 'Could not start a guest session. Please try again or sign in to FaceMeX.');
      }
      if (!data.session) {
        throw new Error('FaceMeX could not establish a secure guest sign-in. Try again or sign in to FaceMeX.');
      }
      const result = await screenShareRequest<{ session: ShareSession }>('request', {
        sessionId,
        displayName,
      });
      setSession(result.session);
      setSessionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not request guest access.');
    } finally {
      setBusyAction('');
    }
  };

  const copyInvitation = async () => {
    try {
      const invitationUrl = getInvitationUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationUrl);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = invitationUrl;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2_000);
    } catch (error) {
      console.error('FaceMeX could not copy the private sharing link', error);
      setActionError('Could not copy the invitation. Copy the page address from your browser instead.');
    }
  };

  const shareInvitation = async () => {
    const invitation = {
      title: 'FaceMeX private screen-sharing invitation',
      text: 'Sign in to FaceMeX or continue as a guest, then request the host’s approval to join.',
      url: getInvitationUrl(),
    };
    if (!navigator.share) {
      await copyInvitation();
      return;
    }

    try {
      await navigator.share(invitation);
      setInvitationShared(true);
      window.setTimeout(() => setInvitationShared(false), 2_000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('FaceMeX could not share the private invitation', error);
      setActionError('Could not open the share menu. Copy the invitation link instead.');
    }
  };

  const askAIAboutSharedFrame = () => {
    const video = localVideoRef.current;
    if (session?.role !== 'host' || !sessionId || !localStream || !video?.videoWidth || !video.videoHeight) {
      setActionError('Start sharing and wait for the screen preview before capturing a frame for FaceMeX AI.');
      return;
    }

    const storageKey = `facemex-screen-share-frame:${sessionId}`;
    let workspaceWindow: Window | null = null;
    setActionError('');
    setFrameSentToWorkspace(false);

    try {
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare a frame from the shared screen.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const imageSize = Math.ceil(dataUrl.length * 0.75);
      if (imageSize > 12 * 1024 * 1024) {
        throw new Error('This screen frame is too large to send to the workspace. Try capturing a different screen.');
      }

      localStorage.setItem(storageKey, JSON.stringify({
        id: crypto.randomUUID(),
        name: 'shared-screen.jpg',
        type: 'image/jpeg',
        size: imageSize,
        dataUrl,
        createdAt: Date.now(),
      }));

      workspaceWindow = window.open('about:blank', '_blank');
      if (!workspaceWindow) {
        localStorage.removeItem(storageKey);
        throw new Error('Your browser blocked the workspace tab. Allow pop-ups for FaceMeX and try again.');
      }

      workspaceWindow.opener = null;
      workspaceWindow.location.replace(`/ai/job-assistant?screenShareFrame=${encodeURIComponent(sessionId)}`);
      window.setTimeout(() => {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.error('FaceMeX could not expire an unused screen frame', error);
        }
      }, 5 * 60 * 1000);
      setFrameSentToWorkspace(true);
    } catch (error) {
      workspaceWindow?.close();
      try {
        localStorage.removeItem(storageKey);
      } catch (cleanupError) {
        console.error('FaceMeX could not clean up an untransferred screen frame', cleanupError);
      }
      setActionError(error instanceof Error ? error.message : 'Could not prepare a frame for FaceMeX AI.');
    }
  };

  const leaveSession = async () => {
    try {
      await stopLocalMedia();
      if (session?.isGuest) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        navigate('/', { replace: true });
        return;
      }
      navigate('/ai/job-assistant');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Meeting media stopped, but the room could not close cleanly.');
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    setBusyAction('end');
    setActionError('');
    try {
      await stopLocalMedia();
      const result = await screenShareRequest<{ session: ShareSession }>('end', { sessionId });
      hostStreamingRef.current = false;
      setSession(result.session);
      setConnectionStatus('Session ended');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not end the session.');
    } finally {
      setBusyAction('');
    }
  };

  const invitationPath = `${location.pathname}${location.search}${location.hash}`;
  const signInHref = `/login?returnTo=${encodeURIComponent(invitationPath)}`;
  const liveCaptureSupported = typeof navigator !== 'undefined' &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  if (!isInitialized) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-sm text-white/60">Checking FaceMeX sign-in…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0d0d0d] px-4 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171717] p-6 shadow-2xl sm:p-8">
          <ShieldCheck className="h-8 w-8 text-cyan-300" />
          <h1 className="mt-4 text-xl font-semibold">{sessionId ? 'Join private screen sharing' : 'Sign in to use private screen sharing'}</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            The invitation link does not grant viewing access by itself. Sign in to FaceMeX, or continue as a guest and wait for the host’s approval.
          </p>
          {sessionId && (
            <div className="mt-5">
              <label htmlFor="screen-share-guest-name" className="mb-2 block text-sm font-medium text-white/75">Your display name</label>
              <input id="screen-share-guest-name" value={guestName} onChange={(event) => setGuestName(event.target.value.slice(0, 80))} maxLength={80} autoComplete="name" className="h-11 w-full rounded-xl border border-white/10 bg-[#0e0f10] px-3 text-sm text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-cyan-300" placeholder="Enter your name" />
              <button type="button" onClick={() => void joinAsGuest()} disabled={!guestName.trim() || Boolean(busyAction)} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-medium text-[#101010] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
                {busyAction === 'guest-request' ? 'Requesting host approval…' : 'Continue as guest'}
              </button>
            </div>
          )}
          <a href={signInHref} className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-medium text-white/85 hover:bg-white/5">
            Sign in to FaceMeX
          </a>
          {actionError && <p className="mt-4 text-sm text-red-300" role="alert">{actionError}</p>}
        </section>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <main className="min-h-[100dvh] bg-[#0d0d0d] px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/ai/job-assistant" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to FaceMeX workspace
          </Link>
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#171717] p-6 shadow-2xl sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300">
              <MonitorUp className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Private screen sharing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Create a private meeting as a registered FaceMeX user. Invitees can sign in or continue as guests, but must wait for your approval before joining.
            </p>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/45">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              Screen capture starts only after you choose a screen in your browser’s native picker. The invitation link alone never authorizes a viewer.
            </p>
            <Button type="button" onClick={() => void createSession()} disabled={busyAction === 'create'} className="mt-6 h-11 rounded-full bg-cyan-300 px-5 text-[#101010] hover:bg-cyan-200">
              <Users className="mr-2 h-4 w-4" />
              {busyAction === 'create' ? 'Creating private link…' : 'Create sharing link'}
            </Button>
            {actionError && <p className="mt-4 text-sm text-red-300" role="alert">{actionError}</p>}
          </section>
        </div>
      </main>
    );
  }

  const role = session?.role;
  const canRequest = role === 'visitor' && !session?.participantStatus;
  const requestState = session?.participantStatus;
  const connectedCount = meetingParticipants.length;
  const connectedToMeeting = Boolean(roomRef.current);
  const durationLabel = `${String(Math.floor(meetingDuration / 3600)).padStart(2, '0')}:${String(Math.floor((meetingDuration % 3600) / 60)).padStart(2, '0')}:${String(meetingDuration % 60).padStart(2, '0')}`;
  const canJoinAsVisitor = role === 'visitor' &&
    requestState === 'approved' &&
    session?.status === 'active' &&
    session.hostConnected;

  return (
    <main className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0d0d0d] text-white">
      <header className="z-30 flex min-h-14 shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-white/10 bg-[#101010] px-3 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] sm:min-h-16 sm:px-5 sm:py-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to={session?.isGuest ? '/' : '/ai/job-assistant'} onClick={session?.isGuest ? (event) => { event.preventDefault(); void leaveSession(); } : undefined} aria-label={session?.isGuest ? 'Leave guest meeting and return to FaceMeX' : 'Back to FaceMeX workspace'} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:h-10 sm:w-10">
            <img src="/facemex-logo.png" alt="FaceMeX" className="h-full w-full object-contain" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">Private meeting</h1>
            <p className="hidden truncate text-xs text-white/45 sm:block">{session?.hostName ? `Hosted by ${session.hostName}` : 'Loading meeting details'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 text-xs text-white/70 sm:px-2.5" role="status" aria-label={session?.status === 'ended' ? 'Meeting ended' : connectionStatus}>
            <span className={`h-2 w-2 rounded-full ${session?.status === 'ended' ? 'bg-red-400' : connectedToMeeting ? 'bg-emerald-400' : 'bg-amber-300'}`} />
            <span className="hidden max-w-28 truncate sm:inline">{session?.status === 'ended' ? 'Meeting ended' : connectionStatus}</span>
          </span>
          {session?.status === 'active' && (
            <span className="hidden items-center gap-1.5 text-xs tabular-nums text-white/50 sm:inline-flex" aria-label={`Meeting duration ${durationLabel}`}>
              <Clock3 className="h-3.5 w-3.5" /> {durationLabel}
            </span>
          )}
          <span className="hidden items-center gap-1.5 text-xs text-white/50 sm:inline-flex" aria-label={`${connectedCount} connected participants`}>
            <Users className="h-4 w-4" /> {connectedCount}
          </span>
          {role === 'host' && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => void copyInvitation()} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 px-2.5 text-xs font-medium text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:px-3" aria-label={linkCopied ? 'Invitation link copied' : 'Copy meeting invitation link'}>
                {linkCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{linkCopied ? 'Copied' : 'Copy link'}</span>
              </button>
              <button type="button" onClick={() => void shareInvitation()} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={invitationShared ? 'Invitation shared' : 'Share invitation'} title={invitationShared ? 'Invitation shared' : 'Share invitation'}>
                {invitationShared ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </header>

      {(sessionError || actionError) && (
        <div className="absolute left-3 right-3 top-16 z-20 rounded-xl border border-red-400/25 bg-[#351d1d]/95 px-4 py-3 text-sm text-red-200 shadow-xl sm:left-5 sm:right-5 sm:top-[4.75rem]" role="alert">
          {actionError || sessionError}
        </div>
      )}

      {!session && (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151618] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/70">
              <MonitorUp className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{sessionError ? 'This meeting is unavailable' : 'Loading private meeting'}</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{sessionError || 'Checking the invitation and your access…'}</p>
            <Link to="/ai/job-assistant" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/80 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <ArrowLeft className="h-4 w-4" /> Back to workspace
            </Link>
          </div>
        </div>
      )}

      {session && (
        <>
          <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-3 sm:pt-4">
            <section ref={stageRef} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090a0b] shadow-2xl">
              <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-1.5 sm:px-4 sm:py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${localStream || remoteTrack ? 'animate-pulse bg-red-400' : 'bg-white/25'}`} />
                  <p className="truncate text-xs font-medium text-white/75">{localStream ? 'You are presenting' : remoteTrack ? 'Live presentation' : 'Meeting stage'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {role === 'host' && session.status !== 'ended' && (
                    <label className="flex items-center gap-1.5 text-xs text-white/50">
                      <span className="sr-only sm:not-sr-only">Quality</span>
                      <select value={screenQuality} onChange={(event) => void changeScreenQuality(event.target.value as ScreenQuality)} disabled={Boolean(busyAction)} className="h-8 rounded-lg border border-white/10 bg-[#151618] px-2 text-xs text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50" aria-label="Screen sharing quality">
                        <option value="auto">Auto</option>
                        <option value="standard">Standard</option>
                        <option value="high">High quality</option>
                      </select>
                    </label>
                  )}
                  <button type="button" onClick={() => void toggleFullscreen()} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={stageFullscreen ? 'Exit full screen' : 'View presentation full screen'}>
                    {stageFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setFitToWindow((fit) => !fit)} className="h-9 rounded-lg border border-white/10 px-2.5 text-xs text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={fitToWindow ? 'Fill presentation window' : 'Fit presentation to window'}>
                    {fitToWindow ? 'Fit' : 'Fill'}
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#08090a]">
                {role === 'host' && localStream ? (
                  <video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full ${fitToWindow ? 'object-contain' : 'object-cover'}`} aria-label="Your live shared-screen preview" />
                ) : remoteTrack ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className={`h-full w-full ${fitToWindow ? 'object-contain' : 'object-cover'}`} aria-label="Live shared screen" />
                ) : (
                  <div className="mx-auto max-w-lg px-5 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/45">
                      {connectionStatus === 'Connecting…' || connectionStatus === 'Reconnecting…' ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" /> : <MonitorUp className="h-6 w-6" />}
                    </div>
                    <h2 className="mt-5 text-base font-semibold text-white/90">
                      {session.status === 'ended' ? 'This meeting has ended'
                        : role === 'visitor' && requestState === 'waiting' ? 'Waiting for host approval'
                          : role === 'visitor' && requestState === 'rejected' ? 'Your request was declined'
                            : role === 'visitor' && requestState === 'removed' ? 'Access was removed'
                              : connectedToMeeting ? 'Waiting for a presentation'
                                : role === 'visitor' && requestState === 'approved' && !session.hostConnected ? 'Waiting for the host to join'
                                  : 'Your meeting is ready' }
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                      {session.status === 'ended' ? 'The host ended this private meeting. You can safely close this page.'
                        : role === 'visitor' && requestState === 'waiting' ? 'Your request has been sent. The host must approve you before you can join.'
                          : role === 'visitor' && requestState === 'rejected' ? 'The host declined this request. Contact them if you think this was a mistake.'
                            : role === 'visitor' && requestState === 'removed' ? 'The host removed your access to this meeting.'
                              : connectedToMeeting ? 'The room is connected. The presenter can start sharing their screen at any time.'
                                : role === 'host' && !liveCaptureSupported ? 'Screen capture is unavailable in this browser or page context. Try a supported browser over a secure HTTPS connection.' : role === 'host' ? 'Choose Share screen to open your browser’s native screen picker. You select exactly what to share; FaceMeX cannot capture without your permission.' : 'Join the meeting when you are ready. Microphone permission is requested only if you choose to turn it on.'}
                    </p>
                    {role === 'host' && session.status !== 'ended' && !connectedToMeeting && (
                      <button type="button" onClick={() => void joinMeeting()} disabled={Boolean(busyAction)} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#111] hover:bg-white/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]">
                        {busyAction === 'join' ? 'Joining…' : 'Join meeting'}
                      </button>
                    )}
                    {role === 'visitor' && canRequest && session.status !== 'ended' && (
                      <button type="button" onClick={() => void requestAccess()} disabled={Boolean(busyAction)} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#111] hover:bg-white/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        <UserCheck className="h-4 w-4" /> {busyAction === 'request' ? 'Sending request…' : 'Request to join'}
                      </button>
                    )}
                    {role === 'visitor' && canJoinAsVisitor && !connectedToMeeting && (
                      <button type="button" onClick={() => void joinMeeting()} disabled={Boolean(busyAction)} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#111] hover:bg-white/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        {busyAction === 'join' ? 'Joining…' : 'Join meeting'}
                      </button>
                    )}
                  </div>
                )}
                <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
              </div>
            </section>

            <div className="z-20 mt-2 flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#171717] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl sm:mt-4 sm:flex-row sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-h-4 w-full min-w-0 items-center justify-center gap-3 sm:w-auto sm:flex-1 sm:justify-start">
                <span className="hidden text-xs tabular-nums text-white/45 sm:inline">{durationLabel}</span>
                <p className="max-w-full truncate text-[11px] text-white/55 sm:text-xs">
                  {connectionStatus}{session.hostName ? ` · ${session.hostName}'s meeting` : ''}
                  {localStream ? ' · Screen is being shared' : ''}
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-nowrap items-center justify-center gap-1 sm:w-auto sm:justify-end sm:gap-2">
                {connectedToMeeting && (
                  <button type="button" onClick={() => void toggleMicrophone()} disabled={microphoneBusy} className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50 ${microphoneEnabled ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/90 text-white hover:bg-red-500'}`} aria-label={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={microphoneEnabled} title={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                    {microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    <span className="hidden sm:inline">{microphoneEnabled ? 'Mute' : 'Unmute'}</span>
                  </button>
                )}
                {role === 'host' && session.status !== 'ended' && (
                  localStream ? (
                    <button type="button" onClick={() => void stopSharing()} className="inline-flex h-11 w-10 items-center justify-center gap-2 rounded-full bg-red-500/90 px-0 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:w-auto sm:px-4" aria-label="Stop screen sharing">
                      <Square className="h-4 w-4" /> <span className="hidden sm:inline">Stop sharing</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => void startSharing()} disabled={Boolean(busyAction) || !liveCaptureSupported} className="inline-flex h-11 w-10 items-center justify-center gap-2 rounded-full bg-white px-0 text-sm font-semibold text-[#111] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:w-auto sm:px-4" aria-label="Start screen sharing" title={liveCaptureSupported ? 'Choose a screen to share' : 'Live screen sharing is not supported in this browser'}>
                      <MonitorUp className="h-4 w-4" /> <span className="hidden sm:inline">{busyAction === 'start' ? 'Starting…' : 'Share screen'}</span>
                    </button>
                  )
                )}
                {role === 'host' && localStream && (
                  <button type="button" onClick={askAIAboutSharedFrame} className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:inline-flex" aria-label={frameSentToWorkspace ? 'Frame opened in FaceMeX workspace' : 'Ask FaceMeX AI about this screen'} title={frameSentToWorkspace ? 'Frame opened in workspace' : 'Ask AI about screen'}>
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={(event) => { panelTriggerRef.current = event.currentTarget; setParticipantsOpen((open) => !open); setChatOpen(false); }} aria-expanded={participantsOpen} aria-controls="screen-share-participants" className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${participantsOpen ? 'bg-white/15 text-white' : 'border border-white/10 text-white/70 hover:bg-white/10'}`} aria-label="Toggle participants and requests" title="Participants">
                  <Users className="h-4 w-4" /><span className="hidden sm:inline">{connectedCount}</span>
                </button>
                {connectedToMeeting && (
                  <button type="button" onClick={(event) => { panelTriggerRef.current = event.currentTarget; setChatOpen((open) => !open); setParticipantsOpen(false); }} aria-expanded={chatOpen} aria-controls="screen-share-chat" className={`inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${chatOpen ? 'bg-white/15 text-white' : 'border border-white/10 text-white/70 hover:bg-white/10'}`} aria-label="Toggle in-meeting chat" title="Meeting chat">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
                {role === 'host' && session.status !== 'ended' && (
                  <button type="button" onClick={() => { if (window.confirm('End this meeting for everyone? The invitation will stop working.')) void endSession(); }} disabled={Boolean(busyAction)} className="inline-flex h-11 w-10 items-center justify-center gap-2 rounded-full border border-red-400/30 px-0 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:w-auto sm:px-3" aria-label="End meeting for everyone" title="End meeting for everyone">
                    <PhoneOff className="h-4 w-4" /><span className="hidden sm:inline">End</span>
                  </button>
                )}
                <button type="button" onClick={() => void leaveSession()} className="inline-flex h-11 w-10 items-center justify-center gap-2 rounded-full border border-white/10 px-0 text-sm text-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:w-auto sm:px-3" aria-label="Leave meeting" title="Leave meeting">
                  <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Leave</span>
                </button>
              </div>
            </div>
          </div>

          {(participantsOpen || chatOpen) && (
            <>
              <button type="button" className="fixed inset-0 z-40 bg-black/55" onClick={() => { setParticipantsOpen(false); setChatOpen(false); }} aria-label="Close meeting panel" />
              <aside
                id={chatOpen ? 'screen-share-chat' : 'screen-share-participants'}
                className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,390px)] flex-col border-l border-white/10 bg-[#151618] pt-[env(safe-area-inset-top)] shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-2xl sm:border sm:pt-0"
                aria-label={chatOpen ? 'Meeting chat' : 'Meeting participants'}
                aria-labelledby="screen-share-panel-title"
                aria-modal="true"
                role="dialog"
              >
                <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-4">
                  <div>
                    <h2 id="screen-share-panel-title" className="text-sm font-semibold">{chatOpen ? 'In-meeting chat' : 'People'}</h2>
                    <p className="mt-0.5 text-xs text-white/45">{chatOpen ? 'Live messages for this meeting' : `${connectedCount} connected`}</p>
                  </div>
                  <button ref={panelCloseButtonRef} type="button" onClick={() => { setParticipantsOpen(false); setChatOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Close panel">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {chatOpen ? (
                  <>
                    <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
                      {chatMessages.length === 0 ? (
                        <div className="py-10 text-center">
                          <MessageCircle className="mx-auto h-6 w-6 text-white/35" />
                          <p className="mt-3 text-sm text-white/70">No messages yet</p>
                          <p className="mt-1 text-xs text-white/40">Messages are shared live and are not saved after this meeting.</p>
                        </div>
                      ) : chatMessages.map((message) => (
                        <article key={message.id} className="min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-xs font-semibold text-white/80">{message.senderName}</p>
                            <time className="shrink-0 text-[11px] text-white/35" dateTime={new Date(message.sentAt).toISOString()}>
                              {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(message.sentAt)}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-white/70">{message.content}</p>
                        </article>
                      ))}
                    </div>
                    <form onSubmit={(event) => void sendMeetingMessage(event)} className="border-t border-white/10 p-3">
                      {chatError && <p className="mb-2 text-xs text-red-300" role="alert">{chatError}</p>}
                      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#0e0f10] p-2 focus-within:border-white/25">
                        <textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))} onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }} rows={1} maxLength={MAX_CHAT_MESSAGE_LENGTH} placeholder="Send a message" aria-label="Meeting message" className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/35" />
                        <button type="submit" disabled={!chatDraft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#111] hover:bg-white/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Send message">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1.5 text-right text-[10px] text-white/30">{chatDraft.length}/{MAX_CHAT_MESSAGE_LENGTH}</p>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 space-y-5 overflow-y-auto p-4">
                    <section>
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">In the meeting</h3>
                      {meetingParticipants.length === 0 ? (
                        <p className="rounded-xl border border-white/[0.07] px-3 py-4 text-sm text-white/45">Join the meeting to see connected participants.</p>
                      ) : meetingParticipants.map((participant) => (
                        <div key={participant.id} className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-3 ${participant.speaking ? 'border-emerald-300/35 bg-emerald-300/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${participant.speaking ? 'bg-emerald-300/20 text-emerald-100' : 'bg-white/10 text-white/70'}`}>
                            {participant.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/85">{participant.name}{participant.local ? ' (you)' : ''}</p>
                            <p className="mt-0.5 text-xs text-white/40">{participant.isHost ? `Host${participant.presenting ? ' · Presenting' : ''}` : participant.presenting ? 'Presenting' : participant.speaking ? 'Speaking' : 'Connected'}</p>
                          </div>
                          {participant.microphoneEnabled ? <Mic className={`h-4 w-4 ${participant.speaking ? 'text-emerald-200' : 'text-white/55'}`} aria-label="Microphone on" /> : <MicOff className="h-4 w-4 text-white/35" aria-label="Microphone off" />}
                        </div>
                      ))}
                    </section>
                    {role === 'host' && (
                      <section>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="text-xs font-medium uppercase tracking-wide text-white/40">Requests to join</h3>
                          <span className="text-xs text-white/35">{session.participants.filter((item) => item.status === 'waiting').length} waiting</span>
                        </div>
                        {session.participants.filter((item) => item.status === 'waiting').length === 0 ? (
                          <p className="rounded-xl border border-white/[0.07] px-3 py-4 text-sm text-white/45">No pending requests.</p>
                        ) : session.participants.filter((item) => item.status === 'waiting').map((participant: ShareParticipant) => (
                          <div key={participant.id} className="mb-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                            <p className="truncate text-sm font-medium text-white/85">{participant.name || 'FaceMeX user'}</p>
                            <p className="mt-1 text-xs text-white/40">{participant.isGuest ? 'Guest · Awaiting approval' : 'Signed-in user · Awaiting approval'}</p>
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => void runHostAction('approve', participant.id)} disabled={Boolean(busyAction)} className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold text-[#111] hover:bg-white/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                                <UserCheck className="mr-1 inline h-3.5 w-3.5" /> Approve
                              </button>
                              <button type="button" onClick={() => void runHostAction('reject', participant.id)} disabled={Boolean(busyAction)} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </section>
                    )}
                    {role === 'host' && session.participants.some((item) => item.status === 'approved') && (
                      <section>
                        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">Approved viewers</h3>
                        {session.participants.filter((item) => item.status === 'approved').map((participant) => (
                          <div key={participant.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] px-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-white/80">{participant.name || 'FaceMeX user'}</p>
                              <p className="mt-0.5 text-xs text-white/40">{participant.isGuest ? 'Guest · ' : ''}{participant.connected ? 'Connected' : 'Approved · Not joined'}</p>
                            </div>
                            <button type="button" onClick={() => void runHostAction('remove', participant.id)} disabled={Boolean(busyAction)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={`Remove ${participant.name || 'viewer'}`} title="Remove viewer">
                              <UserRoundX className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </section>
                    )}
                    {role === 'visitor' && (
                      <div className="rounded-xl border border-white/[0.07] px-3 py-3 text-xs leading-5 text-white/45">
                        {session.isGuest ? 'You joined with a guest account. The host must approve every viewer before they can join this private meeting.' : 'You joined as an authenticated FaceMeX user. The host must approve every viewer before they can join this private meeting.'}
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </>
          )}
        </>
      )}
    </main>
  );
}

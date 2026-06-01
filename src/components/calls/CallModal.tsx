import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Phone,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  VolumeX,
  Languages,
  Loader2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  startCall,
  acceptCall,
  declineCall,
  cancelCall,
  endCall,
  toggleMicrophone,
  toggleCamera,
  listenForCallEvents,
  cleanupCall,
} from '@/lib/callService';

import { getSocket } from '@/lib/socket';

type CallKind = 'voice' | 'audio' | 'video';

type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'incoming'
  | 'accepted'
  | 'connecting'
  | 'connected'
  | 'declined'
  | 'cancelled'
  | 'ended'
  | 'failed';

type IncomingCall = {
  callId: string;
  roomId: string;
  fromUserId: string;
  fromUser?: {
    name?: string;
    avatar?: string;
  } | null;
  callType?: 'audio' | 'video';
};

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  type: CallKind;
  participant: {
    name: string;
    avatar: string;
  };

  /*
    Old support:
    If your parent already gives streams, this modal will still show them.
  */
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onEnd?: () => void;

  /*
    New real-time support:
    Pass these when you want this modal to start / accept real calls.
  */
  myUserId?: string;
  myName?: string;
  myAvatar?: string;
  receiverId?: string;
  incomingCall?: IncomingCall | null;
  autoStart?: boolean;
}

function getInitial(name?: string) {
  return String(name || 'F').trim().charAt(0).toUpperCase() || 'F';
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setVideoStream(ref: React.RefObject<HTMLVideoElement>, stream?: MediaStream | null) {
  if (!ref.current || !stream) return;
  ref.current.srcObject = stream;
}

export default function CallModal({
  open,
  onOpenChange,
  type,
  participant,
  localStream: controlledLocalStream = null,
  remoteStream: controlledRemoteStream = null,
  onToggleMute,
  onToggleVideo,
  onEnd,
  myUserId = '',
  myName = 'FaceMeX user',
  myAvatar = '',
  receiverId = '',
  incomingCall = null,
  autoStart = true,
}: CallModalProps) {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);

  const [internalLocalStream, setInternalLocalStream] = useState<MediaStream | null>(null);
  const [internalRemoteStream, setInternalRemoteStream] = useState<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>(incomingCall ? 'incoming' : 'idle');
  const [callId, setCallId] = useState(incomingCall?.callId || '');
  const [roomId, setRoomId] = useState(incomingCall?.roomId || '');

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type !== 'video');
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [connectionState, setConnectionState] = useState('');
  const [errorText, setErrorText] = useState('');
  const [translatedCaption, setTranslatedCaption] = useState('');

  const activeLocalStream = controlledLocalStream || internalLocalStream;
  const activeRemoteStream = controlledRemoteStream || internalRemoteStream;

  const callType: 'audio' | 'video' = useMemo(() => {
    if (incomingCall?.callType === 'audio' || incomingCall?.callType === 'video') {
      return incomingCall.callType;
    }

    return type === 'video' ? 'video' : 'audio';
  }, [type, incomingCall?.callType]);

  const otherName = incomingCall?.fromUser?.name || participant.name || 'FaceMeX user';
  const otherAvatar = incomingCall?.fromUser?.avatar || participant.avatar || '';

  const hasRealtimeIds = Boolean(myUserId && (receiverId || incomingCall?.callId));
  const isIncoming = Boolean(incomingCall);

  useEffect(() => {
    if (!open) return;

    setStatus(incomingCall ? 'incoming' : 'idle');
    setCallId(incomingCall?.callId || '');
    setRoomId(incomingCall?.roomId || '');
    setErrorText('');
    setTranslatedCaption('');
    startedRef.current = false;
  }, [open, incomingCall?.callId, incomingCall?.roomId]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSeconds(0);
    }
  }, [open]);

  useEffect(() => {
    setVideoStream(remoteVideoRef, activeRemoteStream);
  }, [activeRemoteStream, open]);

  useEffect(() => {
    setVideoStream(localVideoRef, activeLocalStream);
  }, [activeLocalStream, open]);

  useEffect(() => {
    if (!open || !myUserId) return;

    const stopListening = listenForCallEvents({
      userId: myUserId,
      onCallRinging: (payload: any) => {
        setCallId(payload.callId || '');
        setRoomId(payload.roomId || '');
        setStatus('ringing');
      },
      onCallAccepted: (payload: any) => {
        setCallId(payload.callId || '');
        setRoomId(payload.roomId || '');
        setStatus('accepted');
      },
      onCallDeclined: () => {
        setStatus('declined');
        window.setTimeout(() => closeCall(), 900);
      },
      onCallCancelled: () => {
        setStatus('cancelled');
        window.setTimeout(() => closeCall(), 900);
      },
      onCallEnded: () => {
        setStatus('ended');
        window.setTimeout(() => closeCall(), 700);
      },
      onStatus: (nextStatus: CallStatus) => {
        setStatus(nextStatus);
      },
      onError: (error: any) => {
        setErrorText(error?.message || 'Call failed.');
        setStatus('failed');
      },
      onConnectionStateChange: (state: string) => {
        setConnectionState(state);
      },
    });

    return () => {
      stopListening?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myUserId]);

  useEffect(() => {
    if (!open || !autoStart || isIncoming || startedRef.current) return;
    if (!myUserId || !receiverId) return;

    startedRef.current = true;

    startCall({
      myUserId,
      receiverId,
      callType,
      fromUser: {
        name: myName,
        avatar: myAvatar,
      },
      localVideoRef,
      remoteVideoRef,
      setCallId,
      setRoomId,
      setPeerConnection: () => {},
      setLocalStream: (stream: MediaStream) => setInternalLocalStream(stream),
      setRemoteStream: (stream: MediaStream) => setInternalRemoteStream(stream),
      onStatus: (nextStatus: CallStatus) => setStatus(nextStatus),
      onConnectionStateChange: (state: string) => setConnectionState(state),
      onError: (error: any) => {
        setErrorText(error?.message || 'Could not start call.');
        setStatus('failed');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoStart, isIncoming, myUserId, receiverId, callType]);

  useEffect(() => {
    if (!open) return;

    const socket = getSocket();

    const handleTranslation = (payload: any) => {
      if (payload?.translatedText) {
        setTranslatedCaption(payload.translatedText);
      }
    };

    const handleTranslationError = (payload: any) => {
      setTranslatedCaption(payload?.message || 'Translation failed.');
    };

    socket.on('call:translation', handleTranslation);
    socket.on('call:translation-error', handleTranslationError);

    return () => {
      socket.off('call:translation', handleTranslation);
      socket.off('call:translation-error', handleTranslationError);
    };
  }, [open]);

  const handleAccept = async () => {
    if (!incomingCall || !myUserId) return;

    await acceptCall({
      call: incomingCall,
      myUserId,
      callType,
      localVideoRef,
      remoteVideoRef,
      setPeerConnection: () => {},
      setLocalStream: (stream: MediaStream) => setInternalLocalStream(stream),
      setRemoteStream: (stream: MediaStream) => setInternalRemoteStream(stream),
      onStatus: (nextStatus: CallStatus) => setStatus(nextStatus),
      onConnectionStateChange: (state: string) => setConnectionState(state),
      onError: (error: any) => {
        setErrorText(error?.message || 'Could not accept call.');
        setStatus('failed');
      },
    });

    setCallId(incomingCall.callId);
    setRoomId(incomingCall.roomId);
  };

  const handleDecline = () => {
    if (incomingCall?.callId && myUserId) {
      declineCall({
        callId: incomingCall.callId,
        userId: myUserId,
      });
    }

    closeCall();
  };

  const handleEndCall = () => {
    if (onEnd) {
      onEnd();
    }

    if (hasRealtimeIds) {
      if (status === 'calling' || status === 'ringing') {
        cancelCall({
          callId,
          userId: myUserId,
        });
      } else {
        endCall({
          callId,
          roomId,
          myUserId,
        });
      }
    }

    closeCall();
  };

  const closeCall = () => {
    cleanupCall();
    setInternalLocalStream(null);
    setInternalRemoteStream(null);
    setStatus('idle');
    setCallId('');
    setRoomId('');
    setConnectionState('');
    setErrorText('');
    setTranslatedCaption('');
    setTranslateOn(false);
    setSeconds(0);
    startedRef.current = false;
    onOpenChange(false);
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (activeLocalStream) {
      activeLocalStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    toggleMicrophone(!nextMuted);

    if (onToggleMute) {
      onToggleMute();
    }
  };

  const handleVideoToggle = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);

    if (activeLocalStream) {
      activeLocalStream.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }

    toggleCamera(!nextVideoOff);

    if (onToggleVideo) {
      onToggleVideo();
    }
  };

  const handleSpeakerToggle = () => {
    const next = !isSpeakerOff;
    setIsSpeakerOff(next);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = next;
    }
  };

  const handleTranslateToggle = () => {
    const next = !translateOn;
    setTranslateOn(next);

    if (roomId || callId) {
      const socket = getSocket();

      socket.emit('call:translation-toggle', {
        callId,
        roomId,
        userId: myUserId,
        enabled: next,
        language: 'en',
      });
    }

    if (!next) {
      setTranslatedCaption('');
    }
  };

  const statusText = useMemo(() => {
    if (status === 'incoming') return `${otherName} is calling...`;
    if (status === 'calling') return `Calling ${otherName}...`;
    if (status === 'ringing') return `Ringing ${otherName}...`;
    if (status === 'accepted') return 'Call accepted...';
    if (status === 'connecting') return 'Connecting...';
    if (status === 'connected') return 'Connected';
    if (status === 'declined') return 'Call declined';
    if (status === 'cancelled') return 'Call cancelled';
    if (status === 'ended') return 'Call ended';
    if (status === 'failed') return errorText || 'Call failed';

    if (activeRemoteStream) return 'Connected';

    return 'Private call';
  }, [status, otherName, errorText, activeRemoteStream]);

  const showRemoteVideo = callType === 'video' && activeRemoteStream && !isSpeakerOff;
  const showLocalVideo = callType === 'video';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleEndCall();
          return;
        }

        onOpenChange(next);
      }}
    >
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden border-0 bg-[#050711] p-0 text-white sm:h-[92vh] sm:max-w-md sm:rounded-[32px]">
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.16),transparent_35%),linear-gradient(180deg,#050711_0%,#08111f_55%,#020617_100%)]" />
            <motion.div
              className="absolute left-1/2 top-14 h-60 w-60 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl"
              animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.8, 0.45] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative z-10 flex h-14 shrink-0 items-center justify-between px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                FaceMeX {callType === 'audio' ? 'Audio' : 'Video'} Call
              </p>
              <p className="truncate text-[11px] text-white/45">
                {connectionState ? `Connection: ${connectionState}` : formatDuration(seconds)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleEndCall}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative z-10 min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black/25">
                {showRemoteVideo ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 rounded-full bg-cyan-300/20 blur-2xl" />

                      <Avatar className="relative h-24 w-24 border border-white/15 bg-white/10 sm:h-28 sm:w-28">
                        <AvatarImage src={otherAvatar} />
                        <AvatarFallback className="bg-white/10 text-3xl font-semibold text-white">
                          {getInitial(otherName)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    <h3 className="mt-5 max-w-[260px] truncate text-2xl font-semibold tracking-tight">
                      {otherName}
                    </h3>

                    <p className="mt-2 text-sm text-white/50">{statusText}</p>

                    {(status === 'calling' ||
                      status === 'ringing' ||
                      status === 'accepted' ||
                      status === 'connecting') && (
                      <Loader2 className="mt-5 h-6 w-6 animate-spin text-white/55" />
                    )}
                  </div>
                )}

                {showLocalVideo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute right-3 top-3 h-32 w-24 overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl sm:right-4 sm:top-4 sm:h-36 sm:w-28"
                  >
                    {activeLocalStream && !isVideoOff ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10">
                        <VideoOff className="h-6 w-6 text-white/60" />
                      </div>
                    )}
                  </motion.div>
                )}

                <AnimatePresence>
                  {translateOn && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="absolute bottom-4 left-3 right-3 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Languages className="h-3.5 w-3.5 text-cyan-200" />
                        <p className="text-[11px] font-semibold text-cyan-100">
                          Live translation ON
                        </p>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/75">
                        {translatedCaption ||
                          'Speech-to-text will send captions here when connected.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#08111f]/90 px-3 py-4 sm:px-4">
                {isIncoming && status === 'incoming' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      onClick={handleDecline}
                      className="h-12 rounded-2xl bg-red-500 text-white hover:bg-red-600"
                    >
                      <PhoneOff className="mr-2 h-5 w-5" />
                      Decline
                    </Button>

                    <Button
                      type="button"
                      onClick={handleAccept}
                      className="h-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Accept
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={handleMuteToggle}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition sm:h-12 sm:w-12 ${
                        isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </motion.button>

                    {callType === 'video' && (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={handleVideoToggle}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition sm:h-12 sm:w-12 ${
                          isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={handleSpeakerToggle}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition sm:h-12 sm:w-12 ${
                        isSpeakerOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {isSpeakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={handleTranslateToggle}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition sm:h-12 sm:w-12 ${
                        translateOn ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      <Languages className="h-5 w-5" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={handleEndCall}
                      className="flex h-13 w-13 items-center justify-center rounded-full bg-red-500 p-3.5 text-white shadow-[0_18px_45px_rgba(239,68,68,0.35)] transition hover:bg-red-600 sm:h-14 sm:w-14"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

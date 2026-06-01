import { useEffect, useRef, useState } from 'react';
import CallModal from '@/components/calls/CallModal';
import { getSocket, joinUserSocket } from '@/lib/socket';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

type IncomingCall = {
  callId: string;
  roomId: string;
  fromUserId: string;
  fromUser?: {
    name?: string;
    avatar?: string;
  } | null;
  callType?: 'audio' | 'video';
  createdAt?: string;
};

type CurrentUser = {
  id: string;
  name: string;
  avatar: string;
};

function getProfileName(profile: any, fallbackEmail?: string | null) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    fallbackEmail?.split('@')?.[0] ||
    'FaceMeX user'
  );
}

function getProfileAvatar(profile: any) {
  return profile?.avatar_url || profile?.avatar || '';
}

export default function GlobalCallListener() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callOpen, setCallOpen] = useState(false);

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationTimerRef = useRef<number | null>(null);
  const lastCallIdRef = useRef<string | null>(null);

  const stopRingtone = () => {
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    } catch {}

    try {
      navigator.vibrate?.(0);
    } catch {}

    if (vibrationTimerRef.current) {
      window.clearInterval(vibrationTimerRef.current);
      vibrationTimerRef.current = null;
    }
  };

  const startRingtone = () => {
    stopRingtone();

    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('/sounds/facemex-ringtone.mp3');
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.85;
      }

      ringtoneRef.current.play().catch(() => {
        console.log('Ringtone autoplay blocked until user interacts with the app.');
      });
    } catch {}

    try {
      navigator.vibrate?.([700, 300, 700, 300, 700]);
      vibrationTimerRef.current = window.setInterval(() => {
        navigator.vibrate?.([700, 300, 700, 300, 700]);
      }, 3000);
    } catch {}
  };

  const closeCall = () => {
    stopRingtone();
    setCallOpen(false);
    setIncomingCall(null);
    lastCallIdRef.current = null;
  };

  const showBrowserNotification = (payload: IncomingCall) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const callerName = payload.fromUser?.name || 'FaceMeX user';
      const callType = payload.callType === 'video' ? 'video' : 'audio';

      new Notification(`Incoming ${callType} call`, {
        body: `${callerName} is calling you on FaceMeX.`,
        icon: payload.fromUser?.avatar || '/favicon.ico',
        tag: payload.callId,
      });
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!authUser?.id) {
        if (!cancelled) setCurrentUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, name, username, avatar_url, avatar')
        .eq('id', authUser.id)
        .maybeSingle();

      if (cancelled) return;

      const user = {
        id: authUser.id,
        name: getProfileName(profile, authUser.email),
        avatar: getProfileAvatar(profile),
      };

      setCurrentUser(user);
      joinUserSocket(user.id);
    }

    loadCurrentUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;

      if (!userId) {
        setCurrentUser(null);
        closeCall();
        return;
      }

      loadCurrentUser();
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = getSocket();

    joinUserSocket(currentUser.id);

    const handleConnect = () => {
      joinUserSocket(currentUser.id);
    };

    const handleIncomingCall = (payload: IncomingCall) => {
      if (!payload?.callId || !payload?.roomId || !payload?.fromUserId) return;

      if (payload.fromUserId === currentUser.id) return;

      if (lastCallIdRef.current === payload.callId) return;

      lastCallIdRef.current = payload.callId;

      setIncomingCall(payload);
      setCallOpen(true);

      startRingtone();
      showBrowserNotification(payload);

      toast({
        title: 'Incoming call',
        description: `${payload.fromUser?.name || 'Someone'} is calling you.`,
      });
    };

    const handleCallAccepted = (payload: any) => {
      if (!payload?.callId) return;

      if (payload.callId === incomingCall?.callId || payload.callId === lastCallIdRef.current) {
        stopRingtone();
      }
    };

    const handleCallClosed = (payload: any) => {
      const payloadCallId = payload?.callId;

      if (!payloadCallId || payloadCallId === incomingCall?.callId || payloadCallId === lastCallIdRef.current) {
        closeCall();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallClosed);
    socket.on('call:cancelled', handleCallClosed);
    socket.on('call:end', handleCallClosed);
    socket.on('call:cleanup', handleCallClosed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallClosed);
      socket.off('call:cancelled', handleCallClosed);
      socket.off('call:end', handleCallClosed);
      socket.off('call:cleanup', handleCallClosed);
    };
  }, [currentUser?.id, incomingCall?.callId]);

  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, []);

  if (!currentUser || !incomingCall) return null;

  return (
    <CallModal
      open={callOpen}
      onOpenChange={(open) => {
        setCallOpen(open);

        if (!open) {
          closeCall();
        }
      }}
      type={incomingCall.callType === 'video' ? 'video' : 'voice'}
      participant={{
        name: incomingCall.fromUser?.name || 'FaceMeX user',
        avatar: incomingCall.fromUser?.avatar || '',
      }}
      myUserId={currentUser.id}
      myName={currentUser.name}
      myAvatar={currentUser.avatar}
      receiverId={incomingCall.fromUserId}
      incomingCall={incomingCall}
      autoStart={false}
    />
  );
}

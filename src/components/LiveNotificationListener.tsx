import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Send,
  FileText,
  Users,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type LivePopup = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
};

function iconFor(type: string) {
  if (type === 'message') return <Send className="h-4 w-4" />;
  if (type === 'comment') return <MessageCircle className="h-4 w-4" />;
  if (type === 'like') return <Heart className="h-4 w-4" />;
  if (type === 'follow') return <UserPlus className="h-4 w-4" />;
  if (type === 'connection_request') return <Users className="h-4 w-4" />;
  if (type === 'post') return <FileText className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function labelFor(type: string) {
  if (type === 'message') return 'New message';
  if (type === 'comment') return 'New comment';
  if (type === 'like') return 'New reaction';
  if (type === 'follow') return 'New follower';
  if (type === 'connection_request') return 'Connection request';
  if (type === 'post') return 'New post';
  return 'New notification';
}

export default function LiveNotificationListener() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [popup, setPopup] = useState<LivePopup | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      setAuthUserId(data.user?.id || null);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const playTone = (type: string) => {
    if (!soundReady || !audioRef.current) return;

    try {
      const ctx = audioRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      const beep = (frequency: number, start: number, duration: number, volume: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.05);
      };

      if (type === 'message') {
        beep(900, 0, 0.2, 0.95);
        beep(1250, 0.24, 0.25, 1.0);
        return;
      }

      if (type === 'comment') {
        beep(650, 0, 0.2, 0.85);
        beep(900, 0.23, 0.26, 0.95);
        return;
      }

      if (type === 'like') {
        beep(1100, 0, 0.14, 0.75);
        beep(1450, 0.16, 0.16, 0.85);
        return;
      }

      if (type === 'follow') {
        beep(520, 0, 0.2, 0.85);
        beep(780, 0.23, 0.26, 0.95);
        return;
      }

      if (type === 'connection_request') {
        beep(740, 0, 0.16, 0.9);
        beep(980, 0.19, 0.2, 1.0);
        beep(1180, 0.42, 0.22, 1.0);
        return;
      }

      if (type === 'post') {
        beep(580, 0, 0.22, 0.85);
        beep(760, 0.25, 0.28, 0.95);
        return;
      }

      beep(880, 0, 0.25, 0.9);
    } catch (error) {
      console.log('FaceMeX tone failed:', error);
    }
  };

  const showPopup = (n: any) => {
    const id = String(n.id || '');
    if (!id || seenIdsRef.current.has(id)) return;

    seenIdsRef.current.add(id);

    const type = String(n.type || 'event');

    const nextPopup: LivePopup = {
      id,
      type,
      title: n.title || labelFor(type),
      message: n.message || '',
      actionUrl: n.action_url || undefined,
    };

    setPopup(nextPopup);
    playTone(type);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setPopup(null);
    }, 7000);
  };

  const enableSound = async () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const ctx = new AudioContextClass();
      audioRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      setSoundReady(true);

      setPopup({
        id: 'sound-enabled',
        type: 'event',
        title: 'FaceMeX alerts are on',
        message: 'You will now see popups and hear tones for new activity.',
      });

      setTimeout(() => {
        playTone('connection_request');
      }, 250);

      setTimeout(() => {
        setPopup(null);
      }, 4000);
    } catch (error) {
      console.log('Enable sound failed:', error);
      setSoundReady(true);
    }
  };

  useEffect(() => {
    if (!authUserId) return;

    let cancelled = false;
    let pollTimer: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const { data: latest } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (cancelled) return;

      (latest || []).forEach((n: any) => {
        seenIdsRef.current.add(String(n.id));
      });

      channel = supabase
        .channel(`facemex-alerts-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${authUserId}`,
          },
          (payload) => {
            showPopup(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('FaceMeX alerts realtime:', status);
        });

      pollTimer = window.setInterval(async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.log('FaceMeX alert polling error:', error.message);
          return;
        }

        const unseen = (data || [])
          .slice()
          .reverse()
          .find((n: any) => !seenIdsRef.current.has(String(n.id)));

        if (unseen) {
          showPopup(unseen);
        }
      }, 3000);
    }

    start();

    return () => {
      cancelled = true;

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [authUserId, soundReady]);

  return (
    <>
      {authUserId && !soundReady && (
        <button
          type="button"
          onClick={enableSound}
          className="fixed right-4 top-20 z-[99999] rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xl"
        >
          Turn on FaceMeX alerts
        </button>
      )}

      {popup && (
        <div className="fixed left-3 right-3 top-20 z-[99999] mx-auto max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => {
              if (popup.actionUrl) {
                window.location.href = popup.actionUrl;
              }
            }}
            className="w-full p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                {iconFor(popup.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {labelFor(popup.type)}
                </div>

                <div className="mt-1 text-sm font-semibold">
                  {popup.title}
                </div>

                <div className="mt-1 text-sm leading-relaxed text-white/70">
                  {popup.message}
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </>
  );
}

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
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

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
  const { user } = useAuthStore();
  const loadNotifications = useNotificationStore((s) => s.load);

  const [popup, setPopup] = useState<LivePopup | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

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

      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }

      playTone('event');

      setPopup({
        id: 'sound-test',
        type: 'event',
        title: 'FaceMeX alerts are on',
        message: 'You will now hear tones and see popups for new activity.',
      });

      window.setTimeout(() => setPopup(null), 3500);
    } catch (error) {
      console.log('Could not enable notification sound:', error);
      setSoundReady(true);
    }
  };

  const playTone = (type: string) => {
    if (!soundReady || !audioRef.current) return;

    try {
      const ctx = audioRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      const beep = (
        frequency: number,
        start: number,
        duration: number,
        volume: number
      ) => {
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
        beep(900, 0, 0.2, 0.85);
        beep(1250, 0.23, 0.24, 0.9);
        return;
      }

      if (type === 'comment') {
        beep(650, 0, 0.2, 0.75);
        beep(900, 0.22, 0.25, 0.85);
        return;
      }

      if (type === 'like') {
        beep(1100, 0, 0.14, 0.7);
        beep(1450, 0.15, 0.16, 0.75);
        return;
      }

      if (type === 'follow') {
        beep(520, 0, 0.2, 0.75);
        beep(780, 0.22, 0.25, 0.85);
        return;
      }

      if (type === 'connection_request') {
        beep(740, 0, 0.16, 0.8);
        beep(980, 0.18, 0.2, 0.9);
        beep(1180, 0.4, 0.22, 0.9);
        return;
      }

      if (type === 'post') {
        beep(580, 0, 0.22, 0.75);
        beep(760, 0.24, 0.28, 0.85);
        return;
      }

      beep(880, 0, 0.25, 0.8);
    } catch (error) {
      console.log('Tone failed:', error);
    }
  };

  const showNotification = (n: any) => {
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
    loadNotifications().catch(() => {});

    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden
    ) {
      new Notification(nextPopup.title, {
        body: nextPopup.message,
      });
    }

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setPopup(null);
    }, 7000);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | null = null;
    let cancelled = false;

    async function start() {
      const authUserId =
        user?.id || (await supabase.auth.getUser()).data.user?.id;

      if (!authUserId || cancelled) return;

      await loadNotifications().catch(() => {});

      const { data: latest } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      (latest || []).forEach((n: any) => {
        seenIdsRef.current.add(String(n.id));
      });

      channel = supabase
        .channel(`facemex-live-notifications-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${authUserId}`,
          },
          (payload) => {
            showNotification(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('FaceMeX notification channel:', status);
        });

      pollTimer = window.setInterval(async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.log('Notification poll error:', error.message);
          return;
        }

        const unseen = (data || [])
          .slice()
          .reverse()
          .find((n: any) => !seenIdsRef.current.has(String(n.id)));

        if (unseen) {
          showNotification(unseen);
        }
      }, 4000);
    }

    start();

    return () => {
      cancelled = true;

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, soundReady, loadNotifications]);

  return (
    <>
      {!soundReady && user?.id && (
        <button
          type="button"
          onClick={enableSound}
          className="fixed right-4 top-20 z-[9999] rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xl"
        >
          Turn on FaceMeX alerts
        </button>
      )}

      {popup && (
        <div className="fixed left-3 right-3 top-20 z-[9999] mx-auto max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
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

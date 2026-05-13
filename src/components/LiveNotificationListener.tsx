import { useEffect, useRef, useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Send, FileText, Users } from 'lucide-react';

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

function getNotificationIcon(type: string) {
  if (type === 'message') return <Send className="h-4 w-4" />;
  if (type === 'comment') return <MessageCircle className="h-4 w-4" />;
  if (type === 'like') return <Heart className="h-4 w-4" />;
  if (type === 'follow') return <UserPlus className="h-4 w-4" />;
  if (type === 'connection_request') return <Users className="h-4 w-4" />;
  if (type === 'post') return <FileText className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function getNotificationLabel(type: string) {
  if (type === 'message') return 'New message';
  if (type === 'comment') return 'New comment';
  if (type === 'like') return 'New reaction';
  if (type === 'follow') return 'New follower';
  if (type === 'connection_request') return 'New connection request';
  if (type === 'post') return 'New post';
  return 'New notification';
}

export default function LiveNotificationListener() {
  const { user } = useAuthStore();
  const loadNotifications = useNotificationStore((s) => s.load);

  const [popup, setPopup] = useState<LivePopup | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('facemex_sound_enabled') === '1';
  });

  const hideTimerRef = useRef<number | null>(null);

  const playTone = (type: string) => {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();
      const now = audioContext.currentTime;

      const playBeep = (
        frequency: number,
        start: number,
        duration: number,
        volume: number
      ) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.03);
      };

      // Message: clean double ping
      if (type === 'message') {
        playBeep(880, 0, 0.18, 0.38);
        playBeep(1175, 0.2, 0.22, 0.42);
        return;
      }

      // Comment: warm rising tone
      if (type === 'comment') {
        playBeep(660, 0, 0.18, 0.34);
        playBeep(880, 0.18, 0.22, 0.38);
        return;
      }

      // Like/reaction: short soft sparkle
      if (type === 'like') {
        playBeep(1046, 0, 0.12, 0.32);
        playBeep(1318, 0.13, 0.14, 0.34);
        return;
      }

      // Follow: friendly chime
      if (type === 'follow') {
        playBeep(523, 0, 0.18, 0.35);
        playBeep(784, 0.19, 0.22, 0.4);
        return;
      }

      // Connect request: professional alert
      if (type === 'connection_request') {
        playBeep(740, 0, 0.16, 0.38);
        playBeep(988, 0.18, 0.2, 0.42);
        playBeep(1175, 0.38, 0.2, 0.42);
        return;
      }

      // Followed-user post: calm announcement
      if (type === 'post') {
        playBeep(587, 0, 0.2, 0.34);
        playBeep(740, 0.22, 0.24, 0.38);
        return;
      }

      // Default
      playBeep(880, 0, 0.22, 0.38);
    } catch (error) {
      console.log('Notification sound blocked:', error);
    }
  };

  const enableSound = async () => {
    localStorage.setItem('facemex_sound_enabled', '1');
    setSoundEnabled(true);

    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const authUserId =
        user?.id ||
        (await supabase.auth.getUser()).data.user?.id;

      if (!authUserId) return;

      channel = supabase
        .channel(`live-notifications-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${authUserId}`,
          },
          (payload) => {
            const n: any = payload.new;

            const type = String(n.type || 'event');

            const nextPopup: LivePopup = {
              id: String(n.id),
              type,
              title: n.title || getNotificationLabel(type),
              message: n.message || '',
              actionUrl: n.action_url || undefined,
            };

            loadNotifications().catch(() => {});
            setPopup(nextPopup);
            playTone(type);

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
            }, 6500);
          }
        )
        .subscribe();
    }

    start();

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, soundEnabled, loadNotifications]);

  return (
    <>
      {!soundEnabled && (
        <button
          type="button"
          onClick={enableSound}
          className="fixed right-4 top-20 z-[9999] rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xl"
        >
          Enable alert sound
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
                {getNotificationIcon(popup.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {getNotificationLabel(popup.type)}
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

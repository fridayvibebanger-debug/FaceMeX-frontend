import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

type LivePopup = {
  id: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export default function LiveNotificationListener() {
  const { user } = useAuthStore();
  const loadNotifications = useNotificationStore((s) => s.load);

  const [popup, setPopup] = useState<LivePopup | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('facemex_sound_enabled') === '1';
  });

  const hideTimerRef = useRef<number | null>(null);

  const playTone = () => {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.38);
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

    setTimeout(() => playTone(), 100);
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

            const nextPopup: LivePopup = {
              id: String(n.id),
              title: n.title || 'New notification',
              message: n.message || '',
              actionUrl: n.action_url || undefined,
            };

            loadNotifications().catch(() => {});
            setPopup(nextPopup);
            playTone();

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
            }, 5000);
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
          Enable alerts sound
        </button>
      )}

      {popup && (
        <div className="fixed left-3 right-3 top-20 z-[9999] mx-auto max-w-md rounded-2xl border border-white/20 bg-slate-950 text-white shadow-2xl">
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
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Bell className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {popup.title}
                </div>

                <div className="mt-1 text-sm text-white/70">
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

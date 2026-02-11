import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Briefcase, Bell, UsersRound, UserPlus, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNotificationStore } from '@/store/notificationStore';
import { useEffect, useMemo, useRef, useState } from 'react';

const items = [
  { to: '/feed', label: 'Home', Icon: Home },
  { to: '/communities', label: 'Network', Icon: Users },
  { to: '/connect', label: 'Connect', Icon: UserPlus },
  { to: '/messages', label: 'Messages', Icon: MessagesSquare },
  { to: '/notifications', label: 'Alerts', Icon: Bell },
  { to: '/jobs', label: 'Jobs', Icon: Briefcase },
  { to: '/groups/pro', label: 'Groups', Icon: UsersRound },
];

function isActivePath(to: string, pathname: string) {
  if (to === '/groups/pro') return pathname.startsWith('/groups/pro');
  return pathname === to;
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationStore();

  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef<number>(0);
  const tickingRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollStartRef = useRef<number>(0);

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((it) => isActivePath(it.to, location.pathname));
    return idx >= 0 ? idx : 0;
  }, [location.pathname]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef<{ dx: number; dy: number } | null>(null);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    touchDeltaRef.current = { dx: 0, dy: 0 };
    scrollStartRef.current = scrollRef.current?.scrollLeft || 0;
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const start = touchStartRef.current;
    const t = e.touches?.[0];
    if (!start || !t) return;
    touchDeltaRef.current = { dx: t.clientX - start.x, dy: t.clientY - start.y };
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    const d = touchDeltaRef.current;
    touchStartRef.current = null;
    touchDeltaRef.current = null;
    if (!d) return;

    // If the user actually scrolled the nav, do NOT treat it as a swipe-to-navigate.
    const scrolledBy = Math.abs((scrollRef.current?.scrollLeft || 0) - scrollStartRef.current);
    if (scrolledBy > 8) return;

    const dx = d.dx;
    const dy = d.dy;
    if (Math.abs(dx) < 40) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    const nextIndex = dx < 0 ? activeIndex + 1 : activeIndex - 1;
    const clamped = Math.max(0, Math.min(items.length - 1, nextIndex));
    const to = items[clamped]?.to;
    if (to && clamped !== activeIndex) navigate(to);
  };

  useEffect(() => {
    const key = 'faceme_mobile_bottom_nav_scroll_left_v1';
    const el = scrollRef.current;
    if (!el) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) el.scrollLeft = Number(raw) || 0;
    } catch {}

    const onScroll = () => {
      try {
        sessionStorage.setItem(key, String(el.scrollLeft || 0));
      } catch {}
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    const getScrollY = () => {
      if (typeof window === 'undefined') return 0;
      return window.scrollY || window.pageYOffset || 0;
    };

    lastScrollYRef.current = getScrollY();

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentY = getScrollY();
        const prevY = lastScrollYRef.current;
        const delta = currentY - prevY;

        if (currentY < 16) {
          setVisible(true);
        } else if (delta > 8) {
          setVisible(false);
        } else if (delta < -8) {
          setVisible(true);
        }

        lastScrollYRef.current = currentY;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.pathname]);

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out',
        visible ? 'translate-y-0' : 'translate-y-[110%]'
      )}
    >
      <div className="mx-auto max-w-5xl px-2 pb-2">
        <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-background/95 backdrop-blur-xl shadow-lg">
          <div
            ref={scrollRef}
            className="flex gap-1 overflow-x-auto whitespace-nowrap scroll-smooth no-scrollbar px-1"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {items.map(({ to, label, Icon }) => {
              const active = isActivePath(to, location.pathname);
              const showBadge = to === '/notifications' && unreadCount > 0;

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'relative flex flex-col items-center justify-center py-1.5 text-[9px] transition-colors flex-none w-[64px]',
                    active
                      ? 'text-slate-900 dark:text-slate-50'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-bottom-nav-active"
                      className="absolute inset-x-1 top-1.5 bottom-1.5 rounded-xl bg-slate-100 dark:bg-slate-900"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}

                  <div className="relative z-10">
                    <Icon className={cn('h-5 w-5 mb-0.5', active ? 'text-slate-900 dark:text-slate-50' : '')} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn('relative z-10 font-medium', active ? 'text-slate-900 dark:text-slate-50' : '')}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

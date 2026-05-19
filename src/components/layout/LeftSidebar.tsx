import { useEffect } from 'react';
import { Home, Users, Briefcase, Bell, UsersRound, UserPlus, MessagesSquare, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';

const menuItems = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Users, label: 'Network', path: '/communities' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },

  { icon: Sparkles, label: 'Emotion AI', path: '/emotion' },

  { icon: Briefcase, label: 'AI CV Builder', path: '/ai/resume' },
  { icon: Briefcase, label: 'AI Cover Letter', path: '/ai/cover-letter' },
  { icon: Briefcase, label: 'AI Job Assistant', path: '/ai/job-assistant' },

  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { mode, setMode, tier, hasTier } = useUserStore();

  const currentMode = mode === 'professional' ? 'professional' : 'social';

  const userTier = String(tier || user?.tier || 'free').toLowerCase();

  const canUseProfessionalMode =
    typeof hasTier === 'function'
      ? hasTier('creator')
      : ['creator', 'business', 'exclusive'].includes(userTier);

  const displayName =
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'FaceMeX User';

  const avatarUrl = user?.avatar || '';

  useEffect(() => {
    if (!canUseProfessionalMode && currentMode === 'professional') {
      setMode('social');

      try {
        localStorage.setItem('faceme_mode', 'social');
      } catch {
        // ignore localStorage errors
      }
    }
  }, [canUseProfessionalMode, currentMode, setMode]);

  const handleModeChange = (nextMode: 'social' | 'professional') => {
    if (nextMode === 'professional' && !canUseProfessionalMode) {
      return;
    }

    setMode(nextMode);

    try {
      localStorage.setItem('faceme_mode', nextMode);
    } catch {
      // ignore localStorage errors
    }

    navigate('/feed');
  };

  return (
    <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 border-r border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl px-3 py-3 overflow-y-auto">
      <Link
        to="/profile"
        className="mb-3 flex items-center gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
      >
        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-800">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-sm font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {displayName}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            View profile
          </div>
        </div>
      </Link>

      <div className="mb-3 rounded-2xl border border-slate-200/70 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-900/50">
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Feed Mode
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('social')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors',
              currentMode === 'social'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Social
          </button>

          <button
            type="button"
            disabled={!canUseProfessionalMode}
            title={
              canUseProfessionalMode
                ? 'Professional Mode'
                : 'Professional Mode unlocks from Creator tier'
            }
            onClick={() => handleModeChange('professional')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors',
              !canUseProfessionalMode
                ? 'cursor-not-allowed opacity-45 text-slate-400 dark:text-slate-600'
                : currentMode === 'professional'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Pro
          </button>
        </div>

        {!canUseProfessionalMode && (
          <div className="mt-2 px-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            Professional Mode unlocks from Creator tier.
          </div>
        )}
      </div>

      <nav className="space-y-1 text-sm">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            location.pathname === item.path ||
            (item.path !== '/feed' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isActive
                  ? 'bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-900/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

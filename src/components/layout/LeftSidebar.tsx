import {
  Home,
  User,
  MessageCircle,
  Settings,
  Users,
  Briefcase,
  Sparkles,
} from 'lucide-react';
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
  { icon: Users, label: 'Communities', path: '/communities' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },

  // Professional AI tools
  { icon: Briefcase, label: 'AI CV Builder', path: '/ai/resume' },
  { icon: Briefcase, label: 'AI Cover Letter', path: '/ai/cover-letter' },
  { icon: Briefcase, label: 'AI Job Assistant', path: '/ai/job-assistant' },

  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { mode, setMode } = useUserStore();

  const currentMode = mode === 'professional' ? 'professional' : 'social';

  const displayName =
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'FaceMeX User';

  const avatarUrl = user?.avatar || '';

  const handleModeChange = (nextMode: 'social' | 'professional') => {
    setMode(nextMode);

    try {
      localStorage.setItem('faceme_mode', nextMode);
    } catch {
      // ignore localStorage errors
    }

    navigate('/feed');
  };

  return (
    <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 border-r border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl px-3 py-4 overflow-y-auto">
      <Link
        to="/profile"
        className="mb-4 flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
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

      <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-900/50">
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
            onClick={() => handleModeChange('professional')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors',
              currentMode === 'professional'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Pro
          </button>
        </div>
      </div>

      <nav className="space-y-1.5 text-sm">
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
              <Icon className="h-4 w-4" />
              <span className="font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

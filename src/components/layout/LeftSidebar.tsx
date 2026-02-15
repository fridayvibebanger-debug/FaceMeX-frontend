import { Home, User, MessageCircle, Settings, Users, Briefcase } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

  return (
    <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 border-r border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl px-3 py-4 overflow-y-auto">
      <div className="mb-4 px-2" />
      <nav className="space-y-1.5 text-sm">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                isActive
                  ? "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-900/60"
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
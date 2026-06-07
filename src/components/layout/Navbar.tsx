import {
  Bell,
  Briefcase,
  CheckCircle,
  CreditCard,
  Bookmark,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  Search,
  ShoppingBag,
  Sun,
  Wrench,
  Moon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import IdentityVerifiedBadge from '@/components/safety/IdentityVerifiedBadge';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    load,
    read,
    readAll,
    initRealtime,
  } = useNotificationStore();

  const location = useLocation();
  const navigate = useNavigate();

  const userStore = useUserStore() as any;
  const { tier, addons, loadMe, mode, setMode } = userStore;

  const [searchText, setSearchText] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
      ? 'dark'
      : 'light'
  );

  const userAny = user as any;

  const mobileTopIconClass =
    'h-10 w-10 shrink-0 rounded-full text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800';

  const displayName = useMemo(() => {
    return (
      userAny?.full_name ||
      userAny?.name ||
      userStore?.name ||
      userAny?.email?.split('@')[0] ||
      'FaceMeX User'
    );
  }, [userAny, userStore?.name]);

  const avatarUrl = useMemo(() => {
    return (
      userAny?.avatar_url ||
      userAny?.avatar ||
      userStore?.avatar_url ||
      userStore?.avatar ||
      ''
    );
  }, [userAny, userStore?.avatar_url, userStore?.avatar]);

  const initials = useMemo(() => {
    const parts = String(displayName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [displayName]);

  const currentTier = String(tier || userAny?.tier || 'free').toLowerCase();

  const canUseProfessionalMode =
    typeof userStore?.hasTier === 'function'
      ? userStore.hasTier('creator')
      : ['creator', 'business', 'exclusive'].includes(currentTier);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    const userId = String(userAny?.id || userStore?.id || '');

    if (!userId) return;

    initRealtime(userId);
  }, [userAny?.id, userStore?.id, initRealtime]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👤';
      case 'message':
        return '✉️';
      case 'event':
        return '📅';
      case 'circle':
        return '👥';
      case 'connection_request':
        return '🤝';
      default:
        return '🔔';
    }
  };

  const getNotificationIsRead = (notification: any) => {
    return !!(notification?.isRead ?? notification?.is_read);
  };

  const getNotificationActionUrl = (notification: any) => {
    return notification?.actionUrl || notification?.action_url || '';
  };

  const getNotificationDate = (notification: any) => {
    const raw =
      notification?.timestamp ||
      notification?.created_at ||
      notification?.createdAt ||
      Date.now();

    try {
      return new Date(raw);
    } catch {
      return new Date();
    }
  };

  const handleNotificationClick = (notification: any) => {
    read(notification.id).catch(() => markAsRead(notification.id));

    const actionUrl = getNotificationActionUrl(notification);

    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const buildSearchPath = (rawSearch: string) => {
    const q = rawSearch.trim();

    if (!q) return '/feed';

    const lower = q.toLowerCase();
    const encoded = encodeURIComponent(q);

    if (q.startsWith('#')) {
      const tag = q.replace(/^#+/, '').trim();

      if (!tag) return '/feed';

      return `/feed?tag=${encodeURIComponent(tag)}&search=${encodeURIComponent(
        tag
      )}&scope=tags`;
    }

    if (q.startsWith('@')) {
      const username = q.replace(/^@+/, '').trim();

      if (!username) return '/connect';

      return `/connect?search=${encodeURIComponent(username)}&scope=users`;
    }

    const colonIndex = q.indexOf(':');

    if (colonIndex > -1) {
      const prefix = q.slice(0, colonIndex).trim().toLowerCase();
      const value = q.slice(colonIndex + 1).trim();
      const finalValue = value || q;
      const encodedValue = encodeURIComponent(finalValue);
      const finalValueLower = finalValue.toLowerCase();

      if (['user', 'users', 'person', 'people', 'member', 'members'].includes(prefix)) {
        return `/connect?search=${encodedValue}&scope=users`;
      }

      if (['job', 'jobs', 'work', 'vacancy', 'vacancies', 'hiring'].includes(prefix)) {
        return `/jobs?search=${encodedValue}&scope=jobs`;
      }

      if (['group', 'groups', 'community', 'communities'].includes(prefix)) {
        return `/groups/pro?search=${encodedValue}&scope=groups`;
      }

      if (['tag', 'tags', 'hashtag', 'hashtags'].includes(prefix)) {
        return `/feed?tag=${encodedValue}&search=${encodedValue}&scope=tags`;
      }

      if (['feature', 'features', 'tool', 'tools', 'ai'].includes(prefix)) {
        if (
          finalValueLower.includes('job assistant') ||
          finalValueLower.includes('job ai') ||
          finalValueLower.includes('career')
        ) {
          return '/ai/job-assistant';
        }

        if (finalValueLower.includes('cv') || finalValueLower.includes('resume')) {
          return `/ai/resume?search=${encodedValue}`;
        }

        if (finalValueLower.includes('cover')) {
          return `/ai/cover-letter?search=${encodedValue}`;
        }

        return `/tools?search=${encodedValue}&scope=features`;
      }
    }

    if (
      lower.includes('job assistant') ||
      lower.includes('job ai') ||
      lower.includes('career ai') ||
      lower.includes('interview prep') ||
      lower.includes('application message')
    ) {
      return '/ai/job-assistant';
    }

    if (lower.includes('cv') || lower.includes('resume')) {
      return `/ai/resume?search=${encoded}`;
    }

    if (lower.includes('cover letter')) {
      return `/ai/cover-letter?search=${encoded}`;
    }

    if (
      lower.includes('job') ||
      lower.includes('jobs') ||
      lower.includes('vacancy') ||
      lower.includes('hiring') ||
      lower.includes('apply')
    ) {
      return `/jobs?search=${encoded}&scope=jobs`;
    }

    if (lower.includes('group') || lower.includes('community')) {
      return `/groups/pro?search=${encoded}&scope=groups`;
    }

    if (
      lower.includes('market') ||
      lower.includes('marketplace') ||
      lower.includes('shop') ||
      lower.includes('business') ||
      lower.includes('promotion')
    ) {
      return `/marketplace?search=${encoded}`;
    }

    return `/feed?search=${encoded}&scope=all`;
  };

  const handleSearch = () => {
    navigate(buildSearchPath(searchText));
  };

  const handleModeChange = (nextMode: 'social' | 'professional') => {
    if (nextMode === 'professional' && !canUseProfessionalMode) {
      navigate('/subscriptions');
      return;
    }

    setMode(nextMode);

    try {
      localStorage.setItem('faceme_mode', nextMode);
    } catch {
      // ignore
    }

    navigate('/feed');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const linkClass = (path: string) => {
    const active =
      path === '/feed'
        ? location.pathname === '/feed' || location.pathname === '/'
        : location.pathname.startsWith(path);

    return active
      ? 'text-sm text-foreground font-semibold'
      : 'text-sm text-muted-foreground hover:text-foreground';
  };

  const hideBottomNav =
    location.pathname === '/messages' ||
    location.pathname.startsWith('/messages/') ||
    location.pathname === '/jobs' ||
    location.pathname.startsWith('/jobs/') ||
    location.pathname === '/groups/pro' ||
    location.pathname.startsWith('/groups/pro/') ||
    location.pathname === '/settings' ||
    location.pathname.startsWith('/settings/') ||
    location.pathname === '/safety' ||
    location.pathname.startsWith('/safety/') ||
    location.pathname === '/privacy' ||
    location.pathname === '/tos' ||
    location.pathname === '/ethics' ||
    location.pathname === '/community-rules' ||
    location.pathname === '/screenshot-policy' ||
    location.pathname === '/media-shop' ||
    location.pathname.startsWith('/media-shop/');

  const showBottomNav = !hideBottomNav;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 md:h-16 z-50 border-b border-slate-200/70 dark:border-slate-800/70 bg-background">
        <div className="h-full px-3 md:px-4 lg:px-8 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-1.5">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`md:hidden ${mobileTopIconClass}`}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>

              <DrawerContent className="fixed left-3 top-3 bottom-3 w-[calc(100vw-24px)] max-w-[360px] rounded-[28px] border border-border/70 p-0 overflow-hidden shadow-xl bg-background">
                <DrawerHeader className="p-0">
                  <div className="relative px-4 pt-4 pb-3 border-b bg-background">
                    <div className="flex items-center justify-between">
                      <DrawerTitle className="text-foreground">
                        FaceMeX
                      </DrawerTitle>

                      <DrawerClose asChild>
                        <Button variant="ghost" size="icon" aria-label="Close menu">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DrawerClose>
                    </div>

                    <div className="mt-3">
                      <DrawerClose asChild>
                        <Link
                          to="/profile"
                          className="block rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10 border border-border/60 bg-background">
                                <AvatarImage src={avatarUrl} alt={displayName} />
                                <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>

                              {addons?.verified && (
                                <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground shadow-sm ring-2 ring-background">
                                  <CheckCircle className="h-3 w-3 text-white" />
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate">
                                {displayName}
                              </div>

                              {userAny?.email && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {userAny.email}
                                </div>
                              )}

                              <div className="mt-1 flex items-center gap-2">
                                <span className="capitalize px-2 py-0.5 rounded-full text-[11px] bg-muted/30 border border-border/60">
                                  {currentTier}
                                </span>

                                {addons?.verified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/30 border border-border/60">
                                    <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </DrawerClose>
                    </div>
                  </div>
                </DrawerHeader>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-4 py-4 space-y-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                        Mode
                      </div>

                      <div className="grid grid-cols-2 rounded-2xl border bg-card p-1">
                        <button
                          type="button"
                          className={`h-9 rounded-xl text-xs font-semibold ${
                            mode === 'social'
                              ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => handleModeChange('social')}
                        >
                          Social
                        </button>

                        <button
                          type="button"
                          className={`h-9 rounded-xl text-xs font-semibold ${
                            mode === 'professional'
                              ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => handleModeChange('professional')}
                        >
                          Professional
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                        Quick Actions
                      </div>

                      <div className="space-y-1">
                        <DrawerClose asChild>
                          <Link to="/ai/job-assistant" className="flex items-center gap-3 rounded-2xl border border-slate-900 bg-slate-900 px-3 py-3 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                            <Briefcase className="h-4 w-4" />
                            <span className="text-sm font-semibold">Job AI Assistant</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/feed" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Feed</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/marketplace" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Marketplace</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/subscriptions" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Subscriptions</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/media-shop" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Promotions</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/tools" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Tools</span>
                          </Link>
                        </DrawerClose>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                        Navigation
                      </div>

                      <div className="space-y-1">
                        <DrawerClose asChild>
                          <Link to="/ai/resume" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">AI CV Builder</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/ai/cover-letter" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">AI Cover Letter</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/saved" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <Bookmark className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">Saved Posts</span>
                          </Link>
                        </DrawerClose>

                        <DrawerClose asChild>
                          <Link to="/settings" className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">Settings</span>
                          </Link>
                        </DrawerClose>

                        <button
                          type="button"
                          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                          className="w-full flex items-center justify-start text-left gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent"
                        >
                          {theme === 'dark' ? (
                            <Sun className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Moon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="flex-1 text-sm font-medium">Dark mode</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                        Account
                      </div>

                      <DrawerClose asChild>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center justify-start text-left gap-3 rounded-2xl border bg-card px-3 py-3 hover:bg-accent"
                        >
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm font-medium">Logout</span>
                        </button>
                      </DrawerClose>
                    </div>
                  </div>
                </ScrollArea>
              </DrawerContent>
            </Drawer>

            <Link to="/feed" className="hidden md:flex items-center gap-2 group">
              <span className="h-8 w-8 md:h-9 md:w-9 rounded-2xl border border-border/60 bg-muted/30 flex items-center justify-center text-foreground text-base md:text-lg font-semibold">
                F
              </span>

              <span className="text-lg md:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                FaceMeX
              </span>

              <Badge className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                BETA
              </Badge>
            </Link>
          </div>

          <div className="md:hidden flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Search"
                className="pl-10 pr-10 h-9 w-full rounded-full border-slate-200 bg-slate-100/60 dark:bg-slate-800/60 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-400"
              />

              {searchText.trim() && (
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 rounded-full text-[11px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Go
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Search posts, #tags, users, jobs, groups, features..."
                className="pl-10 h-9 rounded-full border-slate-200 bg-slate-100/60 dark:bg-slate-800/60 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-400"
              />

              {searchText.trim() && (
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Go
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm">
            <Link to="/feed" className={linkClass('/feed')}>
              Feed
            </Link>

            <Link to="/marketplace" className={linkClass('/marketplace')}>
              Marketplace
            </Link>

            <Link to="/media-shop" className={linkClass('/media-shop')}>
              Business Promotions
            </Link>

            <Link to="/subscriptions" className={linkClass('/subscriptions')}>
              Subscriptions
            </Link>

            <Link to="/tools" className={linkClass('/tools')}>
              Tools
            </Link>

            <Link to="/ai/job-assistant" className={linkClass('/ai/job-assistant')}>
              Job AI
            </Link>

            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                className={`px-2 py-1 rounded border text-xs ${
                  mode === 'social'
                    ? 'border-primary text-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
                onClick={() => handleModeChange('social')}
              >
                Social
              </button>

              <button
                type="button"
                className={`px-2 py-1 rounded border text-xs ${
                  mode === 'professional'
                    ? 'border-primary text-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
                onClick={() => handleModeChange('professional')}
              >
                Professional
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="capitalize px-2 py-0.5 rounded-full">
                {currentTier}
              </Badge>

              {addons?.verified && (
                <Badge className="px-2 py-0.5 rounded-full">
                  Verified
                </Badge>
              )}

              <IdentityVerifiedBadge />
            </div>

            <div className="hidden md:flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 px-1.5 py-0.5 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />

                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 bg-red-500 text-[10px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-96 p-0" align="end">
                  <div className="p-4 border-b flex items-center justify-between gap-2">
                    <h3 className="font-semibold">Notifications</h3>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="text-xs">
                        <Link to="/subscriptions">Upgrade</Link>
                      </Button>

                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => readAll().catch(() => markAllAsRead())}
                          className="text-xs"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification: any) => {
                          const isRead = getNotificationIsRead(notification);

                          return (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`p-4 cursor-pointer transition-colors ${
                                isRead
                                  ? 'hover:bg-gray-50 dark:hover:bg-slate-900'
                                  : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="text-2xl">
                                  {notification.avatar ? (
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={notification.avatar} />
                                      <AvatarFallback>
                                        {getNotificationIcon(notification.type)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <span>{getNotificationIcon(notification.type)}</span>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold">
                                    {notification.title}
                                  </p>

                                  <p className="text-sm text-muted-foreground">
                                    {notification.message}
                                  </p>

                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(getNotificationDate(notification), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>

                                {!isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 rounded-full border border-slate-200/80 bg-slate-50 px-3 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Link to="/ai/job-assistant">
                  Job AI
                </Link>
              </Button>

              <Link to="/profile" className="relative">
                <Avatar className="cursor-pointer border border-slate-200/80 dark:border-slate-700/80 bg-primary/5 h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {addons?.verified && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 shadow-md ring-2 ring-background">
                    <CheckCircle className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs"
              >
                Logout
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Link to="/ai/job-assistant">
                  Job AI
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {showBottomNav && <MobileBottomNav />}
    </>
  );
}

import { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import FaceMeXSettingsNavigation from './FaceMeXSettingsNavigation';
import FaceMeXAccountSettings from './categories/FaceMeXAccountSettings';
import FaceMeXGeneralSettings from './categories/FaceMeXGeneralSettings';
import FaceMeXHistorySettings from './categories/FaceMeXHistorySettings';
import FaceMeXNotificationSettings from './categories/FaceMeXNotificationSettings';
import FaceMeXPersonalizationSettings from './categories/FaceMeXPersonalizationSettings';
import FaceMeXPrivacySettings from './categories/FaceMeXPrivacySettings';
import FaceMeXSafetySettings from './categories/FaceMeXSafetySettings';
import FaceMeXSecuritySettings from './categories/FaceMeXSecuritySettings';
import FaceMeXStorageSettings from './categories/FaceMeXStorageSettings';
import FaceMeXUsageSettings from './categories/FaceMeXUsageSettings';
import FaceMeXWorkspaceSettings from './categories/FaceMeXWorkspaceSettings';
import { useFaceMeXSettings } from '@/hooks/useFaceMeXSettings';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import type { FaceMeXSettings } from '@/types/facemexSettings';
import type { FaceMeXSettingsCategoryProps } from './FaceMeXSettingsCategoryProps';
import type { SettingsCategory } from './types';

const categorySlugs: Record<SettingsCategory, string> = {
  Account: 'account',
  Workspace: 'workspace',
  Personalization: 'personalization',
  General: 'general',
  'Usage and limits': 'usage-and-limits',
  Notifications: 'notifications',
  Safety: 'safety',
  'Security and login': 'security-and-login',
  Storage: 'storage',
  'Privacy center': 'privacy-center',
  'History and data': 'history-and-data',
};

const slugCategories = Object.fromEntries(
  Object.entries(categorySlugs).map(([category, slug]) => [slug, category]),
) as Record<string, SettingsCategory>;

export default function FaceMeXSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { category: categorySlug } = useParams<{ category?: string }>();
  const { settings, loading, loaded, saving, error, saved, reload, update, clearSaved } = useFaceMeXSettings();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const plan = useUserStore((state) => state.tier);
  const profileName = useUserStore((state) => state.name);
  const activeCategory = categorySlug ? slugCategories[categorySlug] : undefined;
  const requestedReturnPath = (location.state as { from?: string } | null)?.from;
  const returnPath = requestedReturnPath === '/ai/job-assistant' || requestedReturnPath?.startsWith('/projects/')
    ? requestedReturnPath
    : '/ai/job-assistant';

  useEffect(() => {
    if (categorySlug && !activeCategory) navigate('/ai/settings', { replace: true, state: location.state });
  }, [activeCategory, categorySlug, location.state, navigate]);

  const onSave = async (next: FaceMeXSettings) => {
    clearSaved();
    return update(next);
  };

  const categoryProps: FaceMeXSettingsCategoryProps = {
    settings,
    onSave,
    saving,
    saved,
    user: user ? { name: user.name, email: user.email } : profileName ? { name: profileName } : null,
    plan,
    onSignOut: () => {
      logout();
      navigate('/login', { replace: true });
    },
  };

  const renderCategory = () => {
    switch (activeCategory) {
      case 'Account': return <FaceMeXAccountSettings {...categoryProps} />;
      case 'Workspace': return <FaceMeXWorkspaceSettings {...categoryProps} />;
      case 'Personalization': return <FaceMeXPersonalizationSettings {...categoryProps} />;
      case 'General': return <FaceMeXGeneralSettings {...categoryProps} />;
      case 'Usage and limits': return <FaceMeXUsageSettings {...categoryProps} />;
      case 'Notifications': return <FaceMeXNotificationSettings {...categoryProps} />;
      case 'Safety': return <FaceMeXSafetySettings {...categoryProps} />;
      case 'Security and login': return <FaceMeXSecuritySettings {...categoryProps} />;
      case 'Storage': return <FaceMeXStorageSettings {...categoryProps} />;
      case 'Privacy center': return <FaceMeXPrivacySettings {...categoryProps} />;
      case 'History and data': return <FaceMeXHistorySettings {...categoryProps} />;
      default: return null;
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#f7f7f8] text-[#202123] dark:bg-[#0d0d0d] dark:text-[#f5f5f5] md:fixed md:inset-0 md:z-[100] md:flex md:items-center md:justify-center md:overflow-y-auto md:bg-black/30 md:p-5 md:backdrop-blur-[2px] md:dark:bg-black/55">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="facemex-settings-title"
        className="mx-auto flex min-h-[100dvh] w-full max-w-[760px] flex-col bg-[#f7f7f8] px-4 pb-8 pt-4 dark:bg-[#0d0d0d] sm:px-6 md:mx-0 md:h-[min(760px,calc(100dvh-40px))] md:min-h-[480px] md:overflow-hidden md:rounded-[20px] md:border md:border-[#e6e6e6] md:bg-white md:p-0 md:shadow-[0_12px_48px_rgba(0,0,0,0.18)] md:dark:border-[#303030] md:dark:bg-[#171717] md:dark:shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
      >
        <header className="sticky top-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-b border-[#e8e8e8] bg-[#f7f7f8] px-4 py-3 dark:border-[#2c2c2c] dark:bg-[#0d0d0d] sm:-mx-6 sm:px-6 md:mx-0 md:bg-transparent md:px-6 md:py-4 md:dark:bg-transparent">
          <div className="flex min-w-0 items-center gap-2">
            {activeCategory && (
              <button
                type="button"
                onClick={() => navigate('/ai/settings', { state: location.state })}
                aria-label="Back to Settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#eaeaea] dark:text-[#ccc] dark:hover:bg-[#242424]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <p id="facemex-settings-title" className="truncate text-[15px] font-semibold">
              {activeCategory || 'FaceMeX Settings'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(returnPath)}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#eaeaea] dark:text-[#ccc] dark:hover:bg-[#242424]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-0 py-5 md:px-6 md:py-6">
          <div className="mx-auto max-w-2xl">
            {!activeCategory && (
              <>
                <h1 className="mb-1 text-xl font-semibold">Settings</h1>
                <p className="mb-6 text-sm text-[#707070] dark:text-[#aaa]">
                  Manage FaceMeX preferences saved to your account and synced across your devices.
                </p>
              </>
            )}
            {loading ? (
              <div role="status" className="space-y-3" aria-label="Loading FaceMeX settings">
                {[0, 1, 2, 3].map((item) => <div key={item} className="h-[68px] animate-pulse rounded-2xl bg-[#e8e8e8] dark:bg-[#1d1d1d]" />)}
                <p className="sr-only">Loading your saved settings…</p>
              </div>
            ) : error && !loaded ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <p role="alert" className="text-sm text-red-800 dark:text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 text-sm font-medium text-red-800 dark:border-red-800 dark:text-red-200"
                >
                  Retry
                </button>
              </div>
            ) : activeCategory ? (
              <>
                {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">Couldn’t save your settings. {error}</p>}
                {renderCategory()}
              </>
            ) : (
              <>
                {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">Couldn’t save your settings. {error}</p>}
                <FaceMeXSettingsNavigation
                  onSelect={(category) => navigate(`/ai/settings/${categorySlugs[category]}`, { state: location.state })}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

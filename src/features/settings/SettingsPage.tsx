import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LogOut,
  Moon,
  Save,
  Sun,
  X,
} from 'lucide-react';
import { APPEARANCE_CHANGE_EVENT, applyAppearanceMode, getAppearanceMode, type AppearanceMode } from '@/lib/appearance';
import type { PersonalizationProfile } from '@/lib/personalization';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { settingsCategoryGroups, type SettingsCategory } from './settingsCatalog';
import {
  applyAccountSettingsLocally,
  defaultAccountSettings,
  loadAccountSettings,
  saveAccountSettings,
  type AccountSettings,
} from './accountSettings';

const languageOptions = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['pt', 'Portuguese'],
  ['ar', 'Arabic'],
  ['hi', 'Hindi'],
  ['sw', 'Swahili'],
  ['zu', 'Zulu'],
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useUserStore((state) => state.id);
  const plan = useUserStore((state) => state.tier);
  const profileName = useUserStore((state) => state.name);
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const requestedReturnPath = (location.state as { from?: string } | null)?.from;
  const returnPath = requestedReturnPath === '/ai/job-assistant' || requestedReturnPath?.startsWith('/projects/')
    ? requestedReturnPath
    : '/ai/job-assistant';
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(null);
  const [appearance, setAppearance] = useState<AppearanceMode>(() => getAppearanceMode());
  const [profile, setProfile] = useState<PersonalizationProfile>(defaultAccountSettings.personalization);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState(defaultAccountSettings.primaryLanguage);

  const loadSettings = useCallback(async () => {
    setSettingsReady(false);
    setSettingsError('');
    try {
      const settings = await loadAccountSettings();
      setAppearance(settings.appearance);
      setPrimaryLanguage(settings.primaryLanguage);
      setProfile(settings.personalization);
      if (userId) applyAccountSettingsLocally(userId, settings);
      setSettingsReady(true);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to load your account settings.');
    }
  }, [userId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const onAppearanceChange = (event: Event) => {
      const mode = (event as CustomEvent<AppearanceMode>).detail;
      if (mode === 'light' || mode === 'dark') setAppearance(mode);
    };
    window.addEventListener(APPEARANCE_CHANGE_EVENT, onAppearanceChange);
    return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, onAppearanceChange);
  }, []);

  const updateProfile = (field: keyof PersonalizationProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const openPath = (path: string) => navigate(path, { state: { from: location.pathname } });
  const persistSettings = async (settings: AccountSettings) => {
    setSettingsError('');
    setIsSaving(true);
    try {
      const savedSettings = await saveAccountSettings(settings);
      setAppearance(savedSettings.appearance);
      setPrimaryLanguage(savedSettings.primaryLanguage);
      setProfile(savedSettings.personalization);
      setSettingsReady(true);
      return true;
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to save your account settings.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  const currentSettings = (): AccountSettings => ({
    version: 1,
    appearance,
    primaryLanguage,
    personalization: profile,
  });
  const displayName = authUser?.name || profileName;
  const displayEmail = authUser?.email;
  const planLabel = (authUser?.tier || plan || '').replace(/^\w/, (letter) => letter.toUpperCase());

  const renderLink = (label: string, path: string) => (
    <button
      type="button"
      onClick={() => openPath(path)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-left text-sm font-medium text-[#252525] transition hover:bg-[#f4f4f4] dark:border-[#393939] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]"
    >
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#777] dark:text-[#aaa]" />
    </button>
  );

  const renderCategory = () => {
    switch (activeCategory) {
      case 'Account':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">Your FaceMeX account information.</p>
            {displayName || displayEmail ? (
              <div className="rounded-2xl border border-[#e6e6e6] bg-[#f3f3f3] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
                {displayName && <p className="text-sm font-semibold">{displayName}</p>}
                {displayEmail && <p className="mt-1 text-sm text-[#777] dark:text-[#aaa]">{displayEmail}</p>}
              </div>
            ) : (
              <p className="rounded-2xl bg-[#f3f3f3] p-4 text-sm text-[#707070] dark:bg-[#1d1d1d] dark:text-[#aaa]">
                Account profile details are not available in this session.
              </p>
            )}
            {renderLink('Open profile', '/profile')}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-left text-sm font-medium text-[#a33] transition hover:bg-[#fff5f5] dark:border-[#393939] dark:bg-[#202020] dark:text-[#ff9d9d] dark:hover:bg-[#302020]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        );
      case 'Workspace':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Open your existing AI workspace to access conversations, projects, and their files.
            </p>
            {renderLink('Open AI workspace', '/ai/job-assistant')}
          </div>
        );
      case 'Personalization':
        return (
          <div className="space-y-5">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Share context to help FaceMeX tailor relevant answers, plans, and recommendations.
            </p>
            <div>
              <p className="mb-2 text-sm font-medium">I’m setting up FaceMeX for</p>
              <div className="grid grid-cols-2 gap-2 sm:max-w-[420px]">
                {(['individual', 'organization'] as const).map((audience) => {
                  const selected = profile.audience === audience;
                  return (
                    <button
                      key={audience}
                      type="button"
                      disabled={!settingsReady || isSaving}
                      aria-pressed={selected}
                      onClick={() => updateProfile('audience', audience)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${selected
                        ? 'border-[#d6d6d6] bg-white text-[#202123] shadow-sm dark:border-[#414141] dark:bg-[#292929] dark:text-white'
                        : 'border-[#e8e8e8] bg-white text-[#444] hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d] dark:text-[#ddd] dark:hover:bg-[#252525]'}`}
                    >
                      {audience === 'individual' ? 'Myself' : 'Company / team'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                {profile.audience === 'organization' ? 'Company or team name' : 'What should FaceMeX call you?'}
                <input
                  value={profile.name}
                  disabled={!settingsReady || isSaving}
                  onChange={(event) => updateProfile('name', event.target.value)}
                  placeholder={profile.audience === 'organization' ? 'Company or team' : 'Your name'}
                  className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:focus:border-[#888]"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                {profile.audience === 'organization' ? 'Your role' : 'Work, study, or role'}
                <input
                  value={profile.role}
                  disabled={!settingsReady || isSaving}
                  onChange={(event) => updateProfile('role', event.target.value)}
                  placeholder={profile.audience === 'organization' ? 'e.g. Founder, team lead' : 'e.g. Student, designer'}
                  className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:focus:border-[#888]"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">
              What are you working toward?
              <textarea
                value={profile.goals}
                disabled={!settingsReady || isSaving}
                onChange={(event) => updateProfile('goals', event.target.value)}
                placeholder="Goals, projects, or challenges you want help with"
                rows={3}
                className="w-full resize-y rounded-xl border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:focus:border-[#888]"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              How should FaceMeX respond?
              <textarea
                value={profile.preferences}
                disabled={!settingsReady || isSaving}
                onChange={(event) => updateProfile('preferences', event.target.value)}
                placeholder="Tone, level of detail, format, or other preferences"
                rows={3}
                className="w-full resize-y rounded-xl border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:focus:border-[#888]"
              />
            </label>
            <button
              type="button"
              disabled={!settingsReady || isSaving}
              onClick={async () => {
                setSaved(false);
                const didSave = await persistSettings(currentSettings());
                setSaved(didSave);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d6d6d6] bg-white px-4 text-sm font-medium text-[#202123] transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save personalization'}
            </button>
          </div>
        );
      case 'General':
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium">Appearance</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['light', 'dark'] as AppearanceMode[]).map((mode) => {
                  const selected = appearance === mode;
                  const Icon = mode === 'light' ? Sun : Moon;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={!settingsReady || isSaving}
                      aria-pressed={selected}
                      onClick={() => {
                        setAppearance(mode);
                        applyAppearanceMode(mode);
                        void persistSettings({ ...currentSettings(), appearance: mode });
                      }}
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected
                        ? 'border-[#d6d6d6] bg-[#f1f1f1] dark:border-[#414141] dark:bg-[#292929]'
                        : 'border-[#e8e8e8] bg-white hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d] dark:hover:bg-[#252525]'}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{mode === 'light' ? 'Light' : 'Dark'}</span>
                      {selected && <Check className="ml-auto h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block max-w-sm space-y-2 text-sm font-medium">
              Primary language for AI Translator
              <select
                value={primaryLanguage}
                disabled={!settingsReady || isSaving}
                onChange={(event) => {
                  const value = event.target.value;
                  void persistSettings({ ...currentSettings(), primaryLanguage: value });
                }}
                className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal dark:border-[#414141] dark:bg-[#202020]"
              >
                {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        );
      case 'Usage and limits':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              FaceMeX does not currently expose a live usage breakdown here.
            </p>
            {planLabel && (
              <div className="rounded-2xl border border-[#e6e6e6] bg-[#f3f3f3] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
                <p className="text-xs text-[#777] dark:text-[#aaa]">Current plan</p>
                <p className="mt-1 text-sm font-semibold">{planLabel}</p>
              </div>
            )}
            {renderLink('View FaceMeX plans', '/facemex-plus')}
          </div>
        );
      case 'Notifications':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Notification preferences are not currently available in FaceMeX Settings. Your existing notifications are available in the notification center.
            </p>
            {renderLink('Open notification center', '/notifications')}
          </div>
        );
      case 'Safety':
        return (
          <div className="space-y-3">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">Open FaceMeX safety and trust tools.</p>
            {renderLink('Open Safety Center', '/safety')}
            {renderLink('Open Trust Dashboard', '/trust')}
          </div>
        );
      case 'Security and login':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Sign-in is managed by your FaceMeX account provider.
            </p>
            {displayEmail && (
              <div className="rounded-2xl border border-[#e6e6e6] bg-[#f3f3f3] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
                <p className="text-xs text-[#777] dark:text-[#aaa]">Signed in as</p>
                <p className="mt-1 text-sm font-medium">{displayEmail}</p>
              </div>
            )}
            {renderLink('Open Trust Dashboard', '/trust')}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-left text-sm font-medium text-[#a33] transition hover:bg-[#fff5f5] dark:border-[#393939] dark:bg-[#202020] dark:text-[#ff9d9d] dark:hover:bg-[#302020]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        );
      case 'Storage':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Files attached to AI conversations are managed in the workspace. FaceMeX does not currently show a separate storage quota here.
            </p>
            {renderLink('Open AI workspace', '/ai/job-assistant')}
          </div>
        );
      case 'Privacy center':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">Read the existing FaceMeX privacy information.</p>
            {renderLink('Open Privacy Policy', '/privacy')}
          </div>
        );
      case 'History and data':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#707070] dark:text-[#aaa]">
              Saved AI conversations remain available in the workspace. History and project data are not changed by these settings.
            </p>
            {renderLink('Open AI workspace history', '/ai/job-assistant')}
          </div>
        );
      default:
        return null;
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
                onClick={() => setActiveCategory(null)}
                aria-label="Back to Settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#eaeaea] dark:text-[#ccc] dark:hover:bg-[#242424]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <p id="facemex-settings-title" className="truncate text-[15px] font-semibold">
                {activeCategory || 'Settings'}
              </p>
              {activeCategory && <p className="text-xs text-[#777] dark:text-[#aaa]">FaceMeX Settings</p>}
            </div>
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

        <section key={activeCategory || 'settings-home'} className="min-h-0 flex-1 overflow-y-auto px-0 py-5 md:px-6 md:py-6">
          {!settingsReady && (
            <div className="mx-auto mb-5 max-w-2xl rounded-xl border border-[#e6e6e6] bg-white p-4 text-sm dark:border-[#393939] dark:bg-[#202020]">
              {settingsError ? (
                <div className="space-y-3">
                  <p role="alert" className="text-red-700 dark:text-red-300">{settingsError}</p>
                  <button type="button" onClick={() => void loadSettings()} className="rounded-lg border border-[#d6d6d6] px-3 py-2 text-sm font-medium dark:border-[#414141]">
                    Retry loading account settings
                  </button>
                </div>
              ) : (
                <p className="text-[#707070] dark:text-[#aaa]">Loading your account-synced preferences from Supabase…</p>
              )}
            </div>
          )}
          {settingsReady && settingsError && (
            <p role="alert" className="mx-auto mb-5 max-w-2xl rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {settingsError}
            </p>
          )}
          {activeCategory ? (
            <div className="mx-auto max-w-2xl">
              <h1 className="mb-5 text-xl font-semibold">{activeCategory}</h1>
              {renderCategory()}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl">
              <h1 className="mb-1 text-xl font-semibold">Settings</h1>
              <p className="mb-6 text-sm text-[#707070] dark:text-[#aaa]">Manage your FaceMeX account and preferences. Saved preferences stay with your account across devices.</p>
              <div className="space-y-6">
                {settingsCategoryGroups.map((group) => (
                  <section key={group.heading} aria-label={group.heading}>
                    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#777] dark:text-[#aaa]">
                      {group.heading}
                    </h2>
                    <div className="space-y-2">
                      {group.categories.map(({ title, description, icon: Icon }) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => setActiveCategory(title)}
                          className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-[#e7e7e7] bg-[#f1f1f1] px-4 py-3 text-left transition hover:bg-[#eaeaea] dark:border-[#343434] dark:bg-[#1d1d1d] dark:hover:bg-[#292929]"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#555] dark:bg-[#1d1d1d] dark:text-[#ddd]">
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{title}</span>
                            <span className="mt-0.5 block text-xs text-[#777] dark:text-[#aaa]">{description}</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#888] dark:text-[#aaa]" />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

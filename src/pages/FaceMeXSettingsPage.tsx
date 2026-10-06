import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Check, Moon, Palette, Save, Settings2, Sun, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyAppearanceMode, getAppearanceMode, type AppearanceMode } from '@/lib/appearance';
import { getPersonalizationProfile, savePersonalizationProfile, type PersonalizationProfile } from '@/lib/personalization';
import { useUserStore } from '@/store/userStore';

type SettingsSection = 'general' | 'personalization' | 'appearance';

const sections: Array<{ key: SettingsSection; label: string; icon: typeof Settings2 }> = [
  { key: 'general', label: 'General', icon: Settings2 },
  { key: 'personalization', label: 'Personalization', icon: UserRound },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

export default function FaceMeXSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useUserStore((state) => state.id);
  const requestedReturnPath = (location.state as { from?: string } | null)?.from;
  const returnPath = requestedReturnPath === '/ai/job-assistant' || requestedReturnPath?.startsWith('/projects/')
    ? requestedReturnPath
    : '/ai/job-assistant';
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [appearance, setAppearance] = useState<AppearanceMode>(() => getAppearanceMode());
  const [profile, setProfile] = useState<PersonalizationProfile>(() => getPersonalizationProfile(userId));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getPersonalizationProfile(userId));
  }, [userId]);

  const updateProfile = (field: keyof PersonalizationProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveProfile = () => {
    savePersonalizationProfile(userId, profile);
    setSaved(true);
  };

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#202123] dark:bg-[#0d0d0d] dark:text-[#f5f5f5] lg:flex lg:items-center lg:justify-center lg:bg-[#f3f3f3] lg:dark:bg-[#0a0a0a]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:mx-0 lg:h-[min(680px,calc(100dvh-64px))] lg:min-h-[520px] lg:max-w-[960px] lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[#e6e6e6] lg:bg-white lg:p-0 lg:shadow-[0_22px_70px_rgba(15,23,42,0.08)] lg:dark:border-[#303030] lg:dark:bg-[#171717] lg:dark:shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
        <aside className="shrink-0 lg:h-full lg:w-[220px] lg:border-r lg:border-[#efefef] lg:px-3 lg:py-4 lg:dark:border-[#303030]">
          <div className="mb-4 flex items-center justify-between lg:px-1">
            <span className="text-[15px] font-semibold text-[#202123] dark:text-white">Settings</span>
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#eaeaea] dark:text-[#ccc] dark:hover:bg-[#242424]"
            >
              <ArrowLeft className="h-4 w-4 lg:hidden" />
              <X className="hidden h-4 w-4 lg:block" />
            </button>
          </div>

          <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {sections.map((section) => {
              const Icon = section.icon;
              const selected = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => setActiveSection(section.key)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition lg:w-full ${
                    selected
                      ? 'border border-[#e5e5e5] bg-[#f5f5f5] font-medium text-[#202123] dark:border-[#3a3a3a] dark:bg-[#252525] dark:text-white'
                      : 'text-[#555] hover:bg-[#f3f3f3] dark:text-[#bbb] dark:hover:bg-[#1d1d1d]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 lg:flex lg:flex-col lg:overflow-y-auto lg:px-7 lg:py-5">
          <header className="mb-5 hidden shrink-0 border-b border-[#efefef] pb-4 dark:border-[#2a2a2a] lg:block">
            <h1 className="text-[15px] font-semibold text-[#202123] dark:text-white">{sections.find((section) => section.key === activeSection)?.label}</h1>
          </header>

          <div className="mb-6 lg:hidden">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#767676] dark:text-[#aaa]">FaceMeX account</p>
            <h1 className="mt-1 text-2xl font-semibold">{sections.find((section) => section.key === activeSection)?.label}</h1>
          </div>

          {activeSection === 'general' && (
            <section className="max-w-2xl">
              <h2 className="text-base font-semibold">General</h2>
              <p className="mt-1 text-sm text-[#737373] dark:text-[#aaa]">Manage your FaceMeX workspace preferences.</p>
              <div className="mt-6 divide-y divide-[#ededed] dark:divide-[#2c2c2c]">
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#202123] dark:text-white">Personalized responses</p>
                    <p className="mt-1 text-xs text-[#777] dark:text-[#aaa]">Use your Personalization details as context when answering.</p>
                  </div>
                  <button type="button" onClick={() => setActiveSection('personalization')} className="shrink-0 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#333] hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]">
                    Edit
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#202123] dark:text-white">Appearance</p>
                    <p className="mt-1 text-xs capitalize text-[#777] dark:text-[#aaa]">{appearance} theme</p>
                  </div>
                  <button type="button" onClick={() => setActiveSection('appearance')} className="shrink-0 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#333] hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]">
                    Change
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'personalization' && (
            <section className="max-w-2xl">
              <div className="max-w-2xl">
                <h2 className="text-base font-semibold text-[#202123] dark:text-white">Personalization</h2>
                <p className="mt-1 text-sm text-[#737373] dark:text-[#aaa]">Share context to help FaceMeX tailor relevant answers, plans, and recommendations.</p>

                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium">I’m setting up FaceMeX for</p>
                  <div className="grid grid-cols-2 gap-2 sm:max-w-[420px]">
                    {(['individual', 'organization'] as const).map((audience) => {
                      const selected = profile.audience === audience;
                      const Icon = audience === 'individual' ? UserRound : Building2;
                      return (
                        <button
                          key={audience}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateProfile('audience', audience)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
                            selected
                              ? 'border-[#d6d6d6] bg-white text-[#202123] shadow-sm dark:border-[#414141] dark:bg-[#292929] dark:text-white'
                              : 'border-[#e8e8e8] bg-white text-[#444] hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d] dark:text-[#ddd] dark:hover:bg-[#252525]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {audience === 'individual' ? 'Myself' : 'Company / team'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    {profile.audience === 'organization' ? 'Company or team name' : 'What should FaceMeX call you?'}
                    <input
                      value={profile.name}
                      onChange={(event) => updateProfile('name', event.target.value)}
                      placeholder={profile.audience === 'organization' ? 'Company or team' : 'Your name'}
                      className="h-10 w-full rounded-lg border border-[#dedede] bg-white px-3 text-sm font-normal text-[#252525] outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:focus:border-[#888]"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    {profile.audience === 'organization' ? 'Your role' : 'Work, study, or role'}
                    <input
                      value={profile.role}
                      onChange={(event) => updateProfile('role', event.target.value)}
                      placeholder={profile.audience === 'organization' ? 'e.g. Founder, team lead' : 'e.g. Student, designer'}
                      className="h-10 w-full rounded-lg border border-[#dedede] bg-white px-3 text-sm font-normal text-[#252525] outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:focus:border-[#888]"
                    />
                  </label>
                </div>

                <label className="mt-5 block space-y-1.5 text-sm font-medium">
                  What are you working toward?
                  <textarea
                    value={profile.goals}
                    onChange={(event) => updateProfile('goals', event.target.value)}
                    placeholder="Goals, projects, or challenges you want help with"
                    rows={3}
                    className="w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal text-[#252525] outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:focus:border-[#888]"
                  />
                </label>

                <label className="mt-5 block space-y-1.5 text-sm font-medium">
                  How should FaceMeX respond?
                  <textarea
                    value={profile.preferences}
                    onChange={(event) => updateProfile('preferences', event.target.value)}
                    placeholder="Tone, level of detail, format, or other preferences"
                    rows={3}
                    className="w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal text-[#252525] outline-none focus:border-[#999] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:focus:border-[#888]"
                  />
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={saveProfile} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d6d6d6] bg-white px-4 text-sm font-medium text-[#202123] transition hover:bg-[#f4f4f4] dark:border-[#414141] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]">
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? 'Saved' : 'Save personalization'}
                  </button>
                  <p className="text-xs text-[#777] dark:text-[#aaa]">Stored in this account’s browser and used as AI context when relevant.</p>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section className="max-w-2xl">
              <h2 className="text-base font-semibold text-[#202123] dark:text-white">Appearance</h2>
              <p className="mt-1 text-sm text-[#737373] dark:text-[#aaa]">Choose the look used across FaceMeX on desktop and mobile.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:max-w-[560px]">
                {(['light', 'dark'] as AppearanceMode[]).map((mode) => {
                  const selected = appearance === mode;
                  const Icon = mode === 'light' ? Sun : Moon;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setAppearance(mode);
                        applyAppearanceMode(mode);
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-[#d6d6d6] bg-white text-[#202123] shadow-sm dark:border-[#414141] dark:bg-[#292929] dark:text-white'
                          : 'border-[#e8e8e8] bg-white text-[#444] hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d] dark:text-[#ddd] dark:hover:bg-[#252525]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>
                        <span className="block text-sm font-medium">{mode === 'light' ? 'White' : 'Dark'}</span>
                        <span className={`mt-0.5 block text-xs ${selected ? 'opacity-75' : 'text-[#777] dark:text-[#aaa]'}`}>
                          {mode === 'light' ? 'Light surfaces across devices' : 'Dark surfaces across devices'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
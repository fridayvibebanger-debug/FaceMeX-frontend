import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import FaceMeXSettingsPageShell from '@/components/facemex-settings/FaceMeXSettingsPageShell';
import FaceMeXGeneralSettings from '@/components/facemex-settings/categories/FaceMeXGeneralSettings';
import FaceMeXNotificationSettings from '@/components/facemex-settings/categories/FaceMeXNotificationSettings';
import FaceMeXMemorySettings from '@/components/facemex-settings/categories/FaceMeXMemorySettings';
import FaceMeXVoiceSettings from '@/components/facemex-settings/categories/FaceMeXVoiceSettings';
import FaceMeXSecuritySettings from '@/components/facemex-settings/categories/FaceMeXSecuritySettings';
import FaceMeXStorageSettings from '@/components/facemex-settings/categories/FaceMeXStorageSettings';
import FaceMeXUsageSettings from '@/components/facemex-settings/categories/FaceMeXUsageSettings';
import FaceMeXWorkspaceSettings from '@/components/facemex-settings/categories/FaceMeXWorkspaceSettings';
import { useFaceMeXSettings } from '@/hooks/useFaceMeXSettings';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import type { FaceMeXSettings } from '@/types/facemexSettings';
import type { FaceMeXSettingsCategoryProps } from '@/components/facemex-settings/FaceMeXSettingsCategoryProps';

const categories = {
  workspace: { title: 'Workspace', Component: FaceMeXWorkspaceSettings },
  memory: { title: 'Memory', Component: FaceMeXMemorySettings },
  general: { title: 'General', Component: FaceMeXGeneralSettings },
  voice: { title: 'Voice', Component: FaceMeXVoiceSettings },
  'usage-and-limits': { title: 'Usage and limits', Component: FaceMeXUsageSettings },
  notifications: { title: 'Notifications', Component: FaceMeXNotificationSettings },
  'security-and-login': { title: 'Security and login', Component: FaceMeXSecuritySettings },
  storage: { title: 'Storage', Component: FaceMeXStorageSettings },
};

export default function SettingsCategoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { category } = useParams<{ category: string }>();
  const selected = category ? categories[category as keyof typeof categories] : undefined;
  const { settings, loading, loaded, saving, error, saved, reload, update, clearSaved } = useFaceMeXSettings();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const tier = useUserStore((state) => state.tier);
  const profileName = useUserStore((state) => state.name);

  useEffect(() => {
    if (!selected) navigate('/ai/settings', { replace: true, state: location.state });
  }, [location.state, navigate, selected]);

  const save = (next: FaceMeXSettings) => {
    clearSaved();
    return update(next);
  };

  const props: FaceMeXSettingsCategoryProps = {
    settings,
    onSave: save,
    saving,
    saved,
    user: user
      ? { name: user.name, email: user.email, avatar: user.avatar, joinedDate: user.joinedDate }
      : profileName ? { name: profileName } : null,
    plan: tier,
    onSignOut: () => {
      if (!window.confirm('Sign out of your FaceMeX account?')) return;
      void logout()
        .then(() => navigate('/login', { replace: true }))
        .catch((cause) => console.error('Failed to sign out', cause));
    },
  };

  if (!selected) return <Navigate to="/ai/settings" replace />;
  const Category = selected.Component;

  return (
    <FaceMeXSettingsPageShell title={selected.title} onBack={() => navigate('/ai/settings', { state: location.state })}>
      {loading && !loaded ? (
        <div className="fm-settings-info-card" role="status">Loading your saved settings…</div>
      ) : error && !loaded ? (
        <section className="fm-settings-control-section">
          <p className="fm-settings-error" role="alert">{error}</p>
          <button type="button" className="fm-settings-action" onClick={() => void reload()}>Try again</button>
        </section>
      ) : (
        <>
          {error && <p className="fm-settings-error" role="alert">Couldn’t save your settings. {error}</p>}
          <Category {...props} />
        </>
      )}
    </FaceMeXSettingsPageShell>
  );
}

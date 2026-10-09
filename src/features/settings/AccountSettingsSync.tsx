import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { loadAccountSettings, applyAccountSettingsLocally } from './accountSettings';
import { FACEMEX_SETTINGS_CHANGED_EVENT } from '@/services/facemexSettingsService';
import { useNotificationStore } from '@/store/notificationStore';

export default function AccountSettingsSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;
    const refreshNotificationPreferences = () => {
      useNotificationStore.getState().load().catch((error: unknown) => {
        console.error('Unable to refresh FaceMeX notifications after settings changed.', error);
      });
    };
    window.addEventListener(FACEMEX_SETTINGS_CHANGED_EVENT, refreshNotificationPreferences);

    loadAccountSettings()
      .then((settings) => {
        if (cancelled) return;
        applyAccountSettingsLocally(userId, settings);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error('Unable to synchronize FaceMeX account settings.', error);
      });

    return () => {
      cancelled = true;
      window.removeEventListener(FACEMEX_SETTINGS_CHANGED_EVENT, refreshNotificationPreferences);
    };
  }, [isAuthenticated, userId]);

  return null;
}

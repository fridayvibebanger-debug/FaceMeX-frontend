import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import {
  FACEMEX_SETTINGS_CHANGED_EVENT,
  loadFaceMeXSettings,
} from '@/services/facemexSettingsService';

export default function FaceMeXSettingsSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;
    const refreshNotifications = () => {
      useNotificationStore.getState().applySettingsFilters();
      useNotificationStore.getState().load().catch((error: unknown) => {
        console.error('Unable to refresh notifications after FaceMeX settings changed.', error);
      });
    };
    window.addEventListener(FACEMEX_SETTINGS_CHANGED_EVENT, refreshNotifications);

    loadFaceMeXSettings()
      .catch((error: unknown) => {
        if (!cancelled) console.error('Unable to synchronize FaceMeX account settings.', error);
      });

    return () => {
      cancelled = true;
      window.removeEventListener(FACEMEX_SETTINGS_CHANGED_EVENT, refreshNotifications);
    };
  }, [isAuthenticated, userId]);

  return null;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { FACEMEX_SETTINGS_DEFAULTS, loadFaceMeXSettings, saveFaceMeXSettings } from '@/services/facemexSettingsService';
import { useAuthStore } from '@/store/authStore';
import type { FaceMeXSettings } from '@/types/facemexSettings';

export function useFaceMeXSettings() {
  const userId = useAuthStore((state) => state.user?.id);
  const [settings, setSettings] = useState<FaceMeXSettings>(FACEMEX_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const requestId = useRef(0);
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoaded(false);
    setError('');
    try {
      const next = await loadFaceMeXSettings();
      if (request !== requestId.current || useAuthStore.getState().user?.id !== userId) return;
      setSettings(next);
      setLoaded(true);
    } catch (cause) {
      if (request === requestId.current && useAuthStore.getState().user?.id === userId) {
        setError(cause instanceof Error ? cause.message : 'Could not load your settings. Please try again.');
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    requestId.current += 1;
    setSettings(FACEMEX_SETTINGS_DEFAULTS);
    setLoaded(false);
    setSaved(false);
    setError('');
    void reload();
  }, [reload]);

  const update = useCallback(async (next: FaceMeXSettings) => {
    if (savingRef.current) return false;
    const accountId = useAuthStore.getState().user?.id;
    if (!accountId || accountId !== userId) {
      setError('Please sign in again before saving your settings.');
      return false;
    }
    savingRef.current = true;
    const request = ++requestId.current;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const persisted = await saveFaceMeXSettings(next);
      if (request !== requestId.current || useAuthStore.getState().user?.id !== accountId) return false;
      setSettings(persisted);
      setSaved(true);
      return true;
    } catch (cause) {
      if (request === requestId.current && useAuthStore.getState().user?.id === accountId) {
        setError(cause instanceof Error ? cause.message : 'Could not save your settings. Please try again.');
      }
      return false;
    } finally {
      savingRef.current = false;
      if (request === requestId.current) setSaving(false);
    }
  }, [userId]);

  return {
    settings,
    loading,
    loaded,
    saving,
    error,
    saved,
    reload,
    update,
    clearSaved: () => setSaved(false),
  };
}

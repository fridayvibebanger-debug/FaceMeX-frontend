import { useCallback, useEffect, useState } from 'react';
import { FACEMEX_SETTINGS_DEFAULTS, loadFaceMeXSettings, saveFaceMeXSettings } from '@/services/facemexSettingsService';
import type { FaceMeXSettings } from '@/types/facemexSettings';

export function useFaceMeXSettings() {
  const [settings, setSettings] = useState<FaceMeXSettings>(FACEMEX_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoaded(false);
    setError('');
    try {
      setSettings(await loadFaceMeXSettings());
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = useCallback(async (next: FaceMeXSettings) => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const persisted = await saveFaceMeXSettings(next);
      setSettings(persisted);
      setSaved(true);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your settings. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, loaded, saving, error, saved, reload, update, clearSaved: () => setSaved(false) };
}

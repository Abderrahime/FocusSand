import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '@/models/settings';
import { storageService } from '@/services/storage.service';
import { STORAGE_KEYS } from '@/utils/constants';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void storageService.getSettings().then((s) => {
      if (!cancelled) {
        setSettings(s);
        setLoaded(true);
      }
    });

    const unsub = storageService.subscribe<Partial<Settings>>(STORAGE_KEYS.settings, (value) => {
      setSettings({ ...DEFAULT_SETTINGS, ...(value ?? {}) });
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const save = useCallback(async (next: Settings) => {
    await storageService.saveSettings(next);
  }, []);

  return { settings, loaded, save };
}

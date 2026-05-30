import { useEffect, useState } from 'react';
import type { ActiveTimerState } from '@/models/timer';
import { computeElapsedSeconds } from '@/models/timer';
import { storageService } from '@/services/storage.service';
import { STORAGE_KEYS } from '@/utils/constants';

export interface ActiveTimerView {
  state: ActiveTimerState | null;
  elapsedSeconds: number;
}

/**
 * Subscribes to the persisted active timer state and ticks every second
 * to provide a fresh `elapsedSeconds` value for UI rendering.
 */
export function useActiveTimer(): ActiveTimerView {
  const [state, setState] = useState<ActiveTimerState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void storageService.getActiveTimer().then((s) => {
      if (!cancelled) setState(s);
    });

    const unsubscribe = storageService.subscribe<ActiveTimerState | null>(
      STORAGE_KEYS.activeTimer,
      (value) => setState(value ?? null),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!state || state.isPaused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const elapsedSeconds = state ? computeElapsedSeconds(state, now) : 0;

  return { state, elapsedSeconds };
}

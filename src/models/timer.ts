/**
 * Persisted timer state. Only ever one active timer at a time.
 * Stored in chrome.storage.local under STORAGE_KEYS.activeTimer.
 */
export interface ActiveTimerState {
  taskId: string;
  /** Epoch ms when the current run started. null when paused. */
  startedAt: number | null;
  /** Seconds already accumulated from previous (paused) runs. */
  accumulatedSeconds: number;
  /** True only while paused. */
  isPaused: boolean;
  /** True once the user has seen and dismissed the "time up" dialog for this run. */
  timeUpAcknowledged: boolean;
}

export function computeElapsedSeconds(state: ActiveTimerState, now: number = Date.now()): number {
  if (state.isPaused || state.startedAt === null) {
    return state.accumulatedSeconds;
  }
  return state.accumulatedSeconds + Math.floor((now - state.startedAt) / 1000);
}

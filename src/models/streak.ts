/**
 * Tracks consecutive days with at least one non-abandoned completion.
 */
export interface Streak {
  count: number;
  /** Day timestamp (midnight) of the last day that incremented the streak. */
  lastCompletionDay: number | null;
  /** All-time best streak. */
  best: number;
}

export const EMPTY_STREAK: Streak = {
  count: 0,
  lastCompletionDay: null,
  best: 0,
};

import type { Task } from '@/models/task';
import { startOfDay } from '@/utils/time';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayBucket {
  /** Midnight timestamp of this day. */
  date: number;
  /** Total seconds focused on (non-break) tasks that day. */
  focusSeconds: number;
  /** Total seconds spent on breaks that day. */
  breakSeconds: number;
  /** Tasks finished that day (any non-abandoned terminal status). */
  completed: number;
}

/**
 * Builds a chronological list of N days ending today (inclusive),
 * with focus and break totals for each.
 */
export function buildLastNDays(tasks: Task[], days: number, now: number = Date.now()): DayBucket[] {
  const today = startOfDay(now);
  const buckets: DayBucket[] = [];

  for (let i = days - 1; i >= 0; i--) {
    buckets.push({
      date: today - i * DAY_MS,
      focusSeconds: 0,
      breakSeconds: 0,
      completed: 0,
    });
  }

  const indexByDate = new Map(buckets.map((b, idx) => [b.date, idx]));

  for (const task of tasks) {
    const day = startOfDay(task.startedAt ?? task.createdAt);
    const idx = indexByDate.get(day);
    if (idx === undefined) continue;
    const bucket = buckets[idx];
    if (task.isBreak) {
      bucket.breakSeconds += task.actualSeconds;
    } else {
      bucket.focusSeconds += task.actualSeconds;
    }
    if (
      task.status === 'completed_early' ||
      task.status === 'completed_ontime' ||
      task.status === 'completed_late'
    ) {
      bucket.completed += 1;
    }
  }

  return buckets;
}

/** Total focus minutes for the whole horizon. */
export function totalFocusMinutes(buckets: readonly DayBucket[]): number {
  return Math.round(buckets.reduce((sum, b) => sum + b.focusSeconds, 0) / 60);
}

/** Max focus minutes across days, useful to scale the heatmap. */
export function peakFocusMinutes(buckets: readonly DayBucket[]): number {
  let max = 0;
  for (const b of buckets) {
    const m = b.focusSeconds / 60;
    if (m > max) max = m;
  }
  return Math.round(max);
}

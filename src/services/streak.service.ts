import type { Task, TaskStatus } from '@/models/task';
import type { Streak } from '@/models/streak';
import { storageService } from './storage.service';
import { startOfDay } from '@/utils/time';

const COMPLETED: ReadonlySet<TaskStatus> = new Set([
  'completed_early',
  'completed_ontime',
  'completed_late',
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const streakService = {
  /**
   * Called after a task transitions to a terminal status.
   * Increments the streak if the day boundary is crossed.
   */
  async recordCompletion(task: Task): Promise<Streak> {
    const current = await storageService.getStreak();
    if (!COMPLETED.has(task.status)) return current;

    const today = startOfDay(Date.now());

    let next: Streak;
    if (current.lastCompletionDay === today) {
      next = current; // already counted today
    } else if (current.lastCompletionDay !== null && today - current.lastCompletionDay === ONE_DAY_MS) {
      const newCount = current.count + 1;
      next = {
        count: newCount,
        lastCompletionDay: today,
        best: Math.max(current.best, newCount),
      };
    } else {
      // Either first ever, or chain broken.
      next = {
        count: 1,
        lastCompletionDay: today,
        best: Math.max(current.best, 1),
      };
    }

    await storageService.saveStreak(next);
    return next;
  },

  /**
   * Returns a refreshed view: if the chain was broken (gap > 1 day),
   * resets count to 0 without persisting until next completion.
   */
  async getDisplay(): Promise<Streak> {
    const current = await storageService.getStreak();
    if (current.lastCompletionDay === null) return current;
    const today = startOfDay(Date.now());
    const gap = today - current.lastCompletionDay;
    if (gap > ONE_DAY_MS) {
      return { ...current, count: 0 };
    }
    return current;
  },
};

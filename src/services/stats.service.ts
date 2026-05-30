import type { Task, TaskStatus } from '@/models/task';
import { isTerminal, totalEstimatedSeconds } from '@/models/task';
import { isSameDay } from '@/utils/time';

export interface DailyStats {
  date: number;
  totalTasks: number;
  completedTasks: number;
  abandonedTasks: number;
  estimatedSeconds: number;
  actualSeconds: number;
  /** Positive: in retard, negative: in avance. */
  driftSeconds: number;
  /** 0..100 productivity score. */
  score: number;
  byStatus: Record<TaskStatus, number>;
}

export const statsService = {
  forDay(tasks: Task[], dayTimestamp: number = Date.now()): DailyStats {
    const dayTasks = tasks.filter((t) => isSameDay(t.createdAt, dayTimestamp));

    const byStatus = emptyStatusCounter();
    let estimatedSeconds = 0;
    let actualSeconds = 0;
    let completedTasks = 0;
    let abandonedTasks = 0;

    for (const task of dayTasks) {
      byStatus[task.status] += 1;
      estimatedSeconds += totalEstimatedSeconds(task);
      actualSeconds += task.actualSeconds;
      if (
        task.status === 'completed_early' ||
        task.status === 'completed_ontime' ||
        task.status === 'completed_late'
      ) {
        completedTasks += 1;
      } else if (task.status === 'abandoned') {
        abandonedTasks += 1;
      }
    }

    const driftSeconds = actualSeconds - estimatedSeconds;
    const score = computeScore(dayTasks);

    return {
      date: dayTimestamp,
      totalTasks: dayTasks.length,
      completedTasks,
      abandonedTasks,
      estimatedSeconds,
      actualSeconds,
      driftSeconds,
      score,
      byStatus,
    };
  },
};

function emptyStatusCounter(): Record<TaskStatus, number> {
  return {
    pending: 0,
    in_progress: 0,
    paused: 0,
    completed_early: 0,
    completed_ontime: 0,
    completed_late: 0,
    abandoned: 0,
  };
}

/**
 * Simple, transparent productivity score:
 *  +1.0 per task completed on time or early
 *  +0.7 per task completed late
 *  +0.0 per task abandoned
 *  ignore tasks still pending / in progress
 *
 *  Penalty: every unreasonable extension reason on a finished task removes 0.15.
 *  Normalized to /100. If no terminal task today → 0.
 */
function computeScore(tasks: Task[]): number {
  const terminal = tasks.filter((t) => isTerminal(t.status) && !t.isBreak);
  if (terminal.length === 0) return 0;

  let raw = 0;
  for (const t of terminal) {
    if (t.status === 'completed_early' || t.status === 'completed_ontime') raw += 1.0;
    else if (t.status === 'completed_late') raw += 0.7;
    // abandoned → 0

    const unreasonable = t.extensions.filter((e) => e.reasonCategory === 'unreasonable').length;
    raw -= unreasonable * 0.15;
  }

  const normalized = Math.max(0, Math.min(1, raw / terminal.length));
  return Math.round(normalized * 100);
}

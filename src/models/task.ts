import type { TimeExtension } from './reason';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskCategory = 'work' | 'personal' | 'learning' | 'other';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed_early'
  | 'completed_ontime'
  | 'completed_late'
  | 'abandoned';

export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Cumulative seconds actually spent on the task across runs. */
  actualSeconds: number;
  extensions: TimeExtension[];
  /** True for Pomodoro break tasks (excluded from productivity score & garden). */
  isBreak?: boolean;
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: 'Travail',
  personal: 'Personnel',
  learning: 'Apprentissage',
  other: 'Autre',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'À faire',
  in_progress: 'En cours',
  paused: 'En pause',
  completed_early: 'Terminée en avance',
  completed_ontime: 'Terminée à temps',
  completed_late: 'Terminée en retard',
  abandoned: 'Abandonnée',
};

export const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'completed_early',
  'completed_ontime',
  'completed_late',
  'abandoned',
]);

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Total estimated time including all extensions, in seconds. */
export function totalEstimatedSeconds(task: Task): number {
  const extra = task.extensions.reduce((sum, e) => sum + e.addedMinutes, 0);
  return (task.estimatedMinutes + extra) * 60;
}

export function determineCompletionStatus(task: Task): TaskStatus {
  const estimated = totalEstimatedSeconds(task);
  const actual = task.actualSeconds;
  // 5% margin → "à temps"
  const margin = estimated * 0.05;
  if (actual < estimated - margin) return 'completed_early';
  if (actual > estimated + margin) return 'completed_late';
  return 'completed_ontime';
}

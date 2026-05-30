import { useMemo } from 'react';
import type { Task } from '@/models/task';
import { statsService, type DailyStats } from '@/services/stats.service';

export function useTodayStats(tasks: Task[]): DailyStats {
  return useMemo(() => statsService.forDay(tasks, Date.now()), [tasks]);
}

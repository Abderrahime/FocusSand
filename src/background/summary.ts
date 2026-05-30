/// <reference types="chrome" />
import { storageService } from '@/services/storage.service';
import { statsService } from '@/services/stats.service';
import { ALARM_NAMES } from '@/utils/constants';
import { formatDurationShort } from '@/utils/time';

/** Compute the next epoch time at the configured summary hour (today or tomorrow). */
function nextSummaryTime(hour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

export async function rescheduleDailySummary(): Promise<void> {
  const settings = await storageService.getSettings();
  await chrome.alarms.clear(ALARM_NAMES.dailySummary);
  if (!settings.dailySummary) return;
  chrome.alarms.create(ALARM_NAMES.dailySummary, {
    when: nextSummaryTime(settings.dailySummaryHour),
    periodInMinutes: 24 * 60,
  });
}

export async function fireDailySummary(): Promise<void> {
  const tasks = await storageService.getTasks();
  const stats = statsService.forDay(tasks, Date.now());

  // Skip days where nothing happened — no value in a dead notification.
  if (stats.totalTasks === 0) return;

  const overrunOrEarly =
    stats.driftSeconds === 0
      ? 'pile à temps'
      : stats.driftSeconds > 0
        ? `${formatDurationShort(stats.driftSeconds)} de retard`
        : `${formatDurationShort(-stats.driftSeconds)} d'avance`;

  chrome.notifications.create('daily-summary', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `FocusSand — bilan du jour`,
    message: `${stats.completedTasks}/${stats.totalTasks} terminées · ${overrunOrEarly} · score ${stats.score}/100`,
    priority: 1,
  });
}

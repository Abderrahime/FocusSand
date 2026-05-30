/// <reference types="chrome" />
import { storageService } from '@/services/storage.service';
import { computeElapsedSeconds } from '@/models/timer';
import { totalEstimatedSeconds } from '@/models/task';

const COLOR_RUNNING = '#10b981';
const COLOR_WARNING = '#f59e0b';
const COLOR_OVERRUN = '#ef4444';
const COLOR_PAUSED = '#8b8fa8';

/**
 * Reflects the active timer state onto chrome.action — remaining minutes
 * (or "OVR" when overrun) plus a color cue. Called from the service worker
 * on every relevant change and on a per-minute alarm tick.
 */
export async function refreshBadge(): Promise<void> {
  const timer = await storageService.getActiveTimer();
  if (!timer) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'FocusSand' });
    return;
  }

  const tasks = await storageService.getTasks();
  const task = tasks.find((t) => t.id === timer.taskId);
  if (!task) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  const estimated = totalEstimatedSeconds(task);
  const elapsed = computeElapsedSeconds(timer);
  const remaining = estimated - elapsed;
  const remainingRatio = remaining / Math.max(1, estimated);

  let text: string;
  let color: string;

  if (timer.isPaused) {
    text = '⏸';
    color = COLOR_PAUSED;
  } else if (remaining <= 0) {
    text = 'OVR';
    color = COLOR_OVERRUN;
  } else {
    const minutes = Math.ceil(remaining / 60);
    text = minutes > 99 ? '99+' : String(minutes);
    color = remainingRatio <= 0.25 ? COLOR_WARNING : COLOR_RUNNING;
  }

  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({ title: `FocusSand · ${task.title}` });
}

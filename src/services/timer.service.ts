import type { Task } from '@/models/task';
import { determineCompletionStatus, totalEstimatedSeconds } from '@/models/task';
import type { TimeExtension } from '@/models/reason';
import { computeElapsedSeconds } from '@/models/timer';
import { ALARM_NAMES, MESSAGES } from '@/utils/constants';
import { uid } from '@/utils/id';
import { storageService } from './storage.service';
import { streakService } from './streak.service';

const TEN_MINUTES_SECONDS = 10 * 60;

/**
 * Orchestrates the active timer lifecycle. Keeps storage and chrome.alarms
 * in sync so that the popup can close and reopen freely.
 */
export const timerService = {
  async start(task: Task): Promise<void> {
    const now = Date.now();

    const updated: Task = {
      ...task,
      status: 'in_progress',
      startedAt: task.startedAt ?? now,
    };
    await storageService.upsertTask(updated);

    await storageService.setActiveTimer({
      taskId: task.id,
      startedAt: now,
      accumulatedSeconds: 0,
      isPaused: false,
      timeUpAcknowledged: false,
    });

    await scheduleAlarms(updated, 0);
  },

  async pause(): Promise<void> {
    const state = await storageService.getActiveTimer();
    if (!state || state.isPaused || state.startedAt === null) return;

    const elapsedFromRun = Math.floor((Date.now() - state.startedAt) / 1000);

    await storageService.setActiveTimer({
      ...state,
      accumulatedSeconds: state.accumulatedSeconds + elapsedFromRun,
      startedAt: null,
      isPaused: true,
    });

    const task = await findTask(state.taskId);
    if (task) {
      await storageService.upsertTask({ ...task, status: 'paused' });
    }

    await clearAllAlarms();
  },

  async resume(): Promise<void> {
    const state = await storageService.getActiveTimer();
    if (!state || !state.isPaused) return;

    await storageService.setActiveTimer({
      ...state,
      startedAt: Date.now(),
      isPaused: false,
    });

    const task = await findTask(state.taskId);
    if (task) {
      await storageService.upsertTask({ ...task, status: 'in_progress' });
      await scheduleAlarms(task, state.accumulatedSeconds);
    }
  },

  async complete(): Promise<Task | null> {
    const state = await storageService.getActiveTimer();
    if (!state) return null;

    const task = await findTask(state.taskId);
    if (!task) {
      await this.clear();
      return null;
    }

    const finalSeconds = computeElapsedSeconds(state);
    const completed: Task = {
      ...task,
      actualSeconds: finalSeconds,
      completedAt: Date.now(),
      status: 'pending',
    };
    completed.status = determineCompletionStatus(completed);

    await storageService.upsertTask(completed);
    await streakService.recordCompletion(completed);
    await this.clear();
    return completed;
  },

  async abandon(): Promise<Task | null> {
    const state = await storageService.getActiveTimer();
    if (!state) return null;

    const task = await findTask(state.taskId);
    if (!task) {
      await this.clear();
      return null;
    }

    const finalSeconds = computeElapsedSeconds(state);
    const abandoned: Task = {
      ...task,
      actualSeconds: finalSeconds,
      completedAt: Date.now(),
      status: 'abandoned',
    };

    await storageService.upsertTask(abandoned);
    await this.clear();
    return abandoned;
  },

  async extend(
    addedMinutes: number,
    extension: Omit<TimeExtension, 'id' | 'timestamp' | 'addedMinutes'>,
  ): Promise<void> {
    const state = await storageService.getActiveTimer();
    if (!state) return;

    const task = await findTask(state.taskId);
    if (!task) return;

    const newExtension: TimeExtension = {
      ...extension,
      id: uid(),
      addedMinutes,
      timestamp: Date.now(),
    };

    const updated: Task = {
      ...task,
      extensions: [...task.extensions, newExtension],
    };
    await storageService.upsertTask(updated);

    await storageService.setActiveTimer({ ...state, timeUpAcknowledged: false });
    await scheduleAlarms(updated, computeElapsedSeconds(state));
  },

  async acknowledgeTimeUp(): Promise<void> {
    const state = await storageService.getActiveTimer();
    if (!state) return;
    await storageService.setActiveTimer({ ...state, timeUpAcknowledged: true });
  },

  async clear(): Promise<void> {
    await storageService.setActiveTimer(null);
    await clearAllAlarms();
  },
};

async function findTask(taskId: string): Promise<Task | null> {
  const tasks = await storageService.getTasks();
  return tasks.find((t) => t.id === taskId) ?? null;
}

/**
 * Schedule timer-end and (if applicable) 10-minutes-left alarms.
 * Delegates to the service worker via runtime messages so alarms survive
 * popup closure.
 */
async function scheduleAlarms(task: Task, accumulatedSeconds: number): Promise<void> {
  const estimated = totalEstimatedSeconds(task);
  const remainingSeconds = Math.max(0, estimated - accumulatedSeconds);

  await sendOrFallback(MESSAGES.scheduleTimerEnd, ALARM_NAMES.timerEnd, remainingSeconds);

  // 10-min warning, only if at least 10 min remain when (re)starting.
  if (remainingSeconds > TEN_MINUTES_SECONDS) {
    const delay = remainingSeconds - TEN_MINUTES_SECONDS;
    await sendOrFallback(MESSAGES.scheduleTenMinutesLeft, ALARM_NAMES.tenMinutesLeft, delay);
  } else {
    await sendOrFallback(MESSAGES.cancelTenMinutesLeft, ALARM_NAMES.tenMinutesLeft, 0);
  }
}

async function clearAllAlarms(): Promise<void> {
  await sendOrFallback(MESSAGES.cancelTimerEnd, ALARM_NAMES.timerEnd, 0);
  await sendOrFallback(MESSAGES.cancelTenMinutesLeft, ALARM_NAMES.tenMinutesLeft, 0);
}

async function sendOrFallback(messageType: string, alarmName: string, delaySeconds: number): Promise<void> {
  if (delaySeconds <= 0) {
    try {
      await chrome.runtime.sendMessage({ type: messageType });
    } catch {
      await chrome.alarms.clear(alarmName);
    }
    return;
  }
  try {
    await chrome.runtime.sendMessage({ type: messageType, delayMs: delaySeconds * 1000 });
  } catch {
    chrome.alarms.create(alarmName, { when: Date.now() + delaySeconds * 1000 });
  }
}

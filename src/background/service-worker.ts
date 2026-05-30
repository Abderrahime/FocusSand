/// <reference types="chrome" />
import { ALARM_NAMES, MESSAGES, STORAGE_KEYS } from '@/utils/constants';
import { storageService } from '@/services/storage.service';
import { notificationService } from '@/services/notification.service';
import { refreshBadge } from './badge';
import { handleTabUpdate } from './distractions';
import { rescheduleDailySummary, fireDailySummary } from './summary';

/**
 * MV3 service worker.
 *
 * Responsibilities:
 *  - Persist alarms for timer end and 10-min remaining (popup-agnostic).
 *  - Update the action badge with remaining minutes.
 *  - Watch tabs for distracting domains when configured.
 *  - Fire a daily summary notification at the user-chosen hour.
 */

chrome.runtime.onInstalled.addListener(() => {
  void rescheduleDailySummary();
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  void rescheduleDailySummary();
  void refreshBadge();
});

/* -------------------- Messaging -------------------- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  switch (message.type) {
    case MESSAGES.scheduleTimerEnd: {
      if (typeof message.delayMs === 'number' && message.delayMs > 0) {
        chrome.alarms.create(ALARM_NAMES.timerEnd, {
          when: Date.now() + message.delayMs,
        });
      }
      sendResponse({ ok: true });
      return true;
    }
    case MESSAGES.cancelTimerEnd: {
      void chrome.alarms.clear(ALARM_NAMES.timerEnd);
      sendResponse({ ok: true });
      return true;
    }
    case MESSAGES.scheduleTenMinutesLeft: {
      if (typeof message.delayMs === 'number' && message.delayMs > 0) {
        chrome.alarms.create(ALARM_NAMES.tenMinutesLeft, {
          when: Date.now() + message.delayMs,
        });
      }
      sendResponse({ ok: true });
      return true;
    }
    case MESSAGES.cancelTenMinutesLeft: {
      void chrome.alarms.clear(ALARM_NAMES.tenMinutesLeft);
      sendResponse({ ok: true });
      return true;
    }
    case MESSAGES.refreshBadge: {
      void refreshBadge();
      sendResponse({ ok: true });
      return true;
    }
    case MESSAGES.rescheduleSummary: {
      void rescheduleDailySummary();
      sendResponse({ ok: true });
      return true;
    }
  }

  return false;
});

/* -------------------- Alarms -------------------- */

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case ALARM_NAMES.timerEnd: {
      const timer = await storageService.getActiveTimer();
      if (!timer || timer.isPaused) return;
      const tasks = await storageService.getTasks();
      const task = tasks.find((t) => t.id === timer.taskId);
      if (task) notificationService.timerEnded(task);
      void refreshBadge();
      return;
    }
    case ALARM_NAMES.tenMinutesLeft: {
      const timer = await storageService.getActiveTimer();
      if (!timer || timer.isPaused) return;
      const tasks = await storageService.getTasks();
      const task = tasks.find((t) => t.id === timer.taskId);
      if (task) {
        chrome.notifications.create(`ten-left-${task.id}-${Date.now()}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'FocusSand — 10 minutes restantes',
          message: `Plus que 10 min pour « ${task.title} ». On reste focus.`,
          priority: 1,
        });
      }
      return;
    }
    case ALARM_NAMES.badgeTick: {
      void refreshBadge();
      return;
    }
    case ALARM_NAMES.dailySummary: {
      await fireDailySummary();
      return;
    }
  }
});

/* -------------------- Notifications -------------------- */

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('timer-end-') || notificationId === 'daily-summary' || notificationId.startsWith('ten-left-')) {
    chrome.action.openPopup?.().catch(() => {
      // openPopup requires a user gesture in some contexts; ignore.
    });
  }
});

/* -------------------- Storage-driven side effects -------------------- */

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (STORAGE_KEYS.activeTimer in changes || STORAGE_KEYS.tasks in changes) {
    void refreshBadge();
    void manageBadgeTick();
  }
  if (STORAGE_KEYS.settings in changes) {
    void rescheduleDailySummary();
  }
});

/** Tick every minute so the badge stays accurate while a timer runs. */
async function manageBadgeTick(): Promise<void> {
  const timer = await storageService.getActiveTimer();
  if (timer && !timer.isPaused) {
    const existing = await chrome.alarms.get(ALARM_NAMES.badgeTick);
    if (!existing) {
      chrome.alarms.create(ALARM_NAMES.badgeTick, { periodInMinutes: 1 });
    }
  } else {
    await chrome.alarms.clear(ALARM_NAMES.badgeTick);
  }
}

/* -------------------- Tabs (distraction detection) -------------------- */

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  void handleTabUpdate(tabId, info, tab);
});

export {};

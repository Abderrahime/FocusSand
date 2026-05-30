/// <reference types="chrome" />
import { storageService } from '@/services/storage.service';
import { notificationService } from '@/services/notification.service';
import { DISTRACTING_DOMAINS, STORAGE_KEYS } from '@/utils/constants';

/** Don't re-notify for the same domain within this window. */
const DEBOUNCE_MS = 5 * 60 * 1000;

type DistractionMemo = Record<string, number>; // domain → last notified ts

export async function handleTabUpdate(_tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): Promise<void> {
  if (info.status !== 'complete' || !tab.url || tab.url.startsWith('chrome://')) return;

  const settings = await storageService.getSettings();
  if (!settings.distractionDetection) return;

  const timer = await storageService.getActiveTimer();
  if (!timer || timer.isPaused) return;

  let host: string;
  try {
    host = new URL(tab.url).hostname.toLowerCase();
  } catch {
    return;
  }

  const matched = DISTRACTING_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
  if (!matched) return;

  const memo = (await chrome.storage.local.get(STORAGE_KEYS.distractionMemo))[
    STORAGE_KEYS.distractionMemo
  ] as DistractionMemo | undefined;
  const now = Date.now();
  if (memo && memo[matched] && now - memo[matched] < DEBOUNCE_MS) return;

  const tasks = await storageService.getTasks();
  const task = tasks.find((t) => t.id === timer.taskId);
  if (!task) return;

  notificationService.distractionDetected(task, matched);

  await chrome.storage.local.set({
    [STORAGE_KEYS.distractionMemo]: { ...(memo ?? {}), [matched]: now },
  });
}

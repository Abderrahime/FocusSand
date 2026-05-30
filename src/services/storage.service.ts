import type { Task } from '@/models/task';
import type { ActiveTimerState } from '@/models/timer';
import { DEFAULT_SETTINGS, type Settings } from '@/models/settings';
import { EMPTY_STREAK, type Streak } from '@/models/streak';
import type { Plant } from '@/models/plant';
import { STORAGE_KEYS } from '@/utils/constants';

type Listener<T> = (value: T) => void;

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

async function remove(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

export const storageService = {
  // ---------- Tasks ----------

  async getTasks(): Promise<Task[]> {
    return get<Task[]>(STORAGE_KEYS.tasks, []);
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    await set(STORAGE_KEYS.tasks, tasks);
  },

  async upsertTask(task: Task): Promise<void> {
    const tasks = await this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.push(task);
    await this.saveTasks(tasks);
  },

  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    await this.saveTasks(tasks.filter((t) => t.id !== taskId));
  },

  // ---------- Settings ----------

  async getSettings(): Promise<Settings> {
    const partial = await get<Partial<Settings>>(STORAGE_KEYS.settings, {});
    return { ...DEFAULT_SETTINGS, ...partial };
  },

  async saveSettings(settings: Settings): Promise<void> {
    await set(STORAGE_KEYS.settings, settings);
  },

  // ---------- Streak ----------

  async getStreak(): Promise<Streak> {
    return get<Streak>(STORAGE_KEYS.streak, EMPTY_STREAK);
  },

  async saveStreak(streak: Streak): Promise<void> {
    await set(STORAGE_KEYS.streak, streak);
  },

  // ---------- Garden ----------

  async getPlants(): Promise<Plant[]> {
    return get<Plant[]>(STORAGE_KEYS.garden, []);
  },

  async savePlants(plants: Plant[]): Promise<void> {
    await set(STORAGE_KEYS.garden, plants);
  },

  // ---------- Active timer ----------

  async getActiveTimer(): Promise<ActiveTimerState | null> {
    return get<ActiveTimerState | null>(STORAGE_KEYS.activeTimer, null);
  },

  async setActiveTimer(state: ActiveTimerState | null): Promise<void> {
    if (state === null) {
      await remove(STORAGE_KEYS.activeTimer);
    } else {
      await set(STORAGE_KEYS.activeTimer, state);
    }
  },

  // ---------- Subscription ----------

  /**
   * Subscribe to changes for a given key. Returns an unsubscribe function.
   * Useful to keep React state in sync when the service worker mutates storage.
   */
  subscribe<T>(key: string, listener: Listener<T | undefined>): () => void {
    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName,
    ) => {
      if (areaName !== 'local') return;
      if (key in changes) {
        listener(changes[key].newValue as T | undefined);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  },
};

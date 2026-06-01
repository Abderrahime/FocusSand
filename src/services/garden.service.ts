import type { Plant, PlantSize } from '@/models/plant';
import type { Task, TaskCategory } from '@/models/task';
import { storageService } from './storage.service';
import { uid } from '@/utils/id';

/**
 * Maps category + size to a thematic emoji. Adjust freely — the rest of
 * the app reads `plant.emoji` directly, no other dependency on this map.
 */
const PLANT_EMOJI: Record<TaskCategory, Record<PlantSize, string>> = {
  work:     { small: '🌱', medium: '🌿', large: '🌳' },
  personal: { small: '🌷', medium: '🌹', large: '🌸' },
  sport:    { small: '🌻', medium: '🌼', large: '🪴' },
  learning: { small: '🍀', medium: '🌾', large: '🎋' },
  other:    { small: '🍃', medium: '🌵', large: '🌲' },
};

/** Representative emoji per category for the garden legend (the small variant). */
export const CATEGORY_EMOJI: Record<TaskCategory, string> = {
  work: '🌱',
  personal: '🌷',
  sport: '🌻',
  learning: '🍀',
  other: '🍃',
};

function pickSize(estimatedMinutes: number): PlantSize {
  if (estimatedMinutes < 15) return 'small';
  if (estimatedMinutes < 45) return 'medium';
  return 'large';
}

export const gardenService = {
  async getAll(): Promise<Plant[]> {
    return storageService.getPlants();
  },

  /** Plants a new specimen for a completed task. */
  async plant(task: Task): Promise<Plant | null> {
    if (task.isBreak) return null;
    const size = pickSize(task.estimatedMinutes);
    const emoji = PLANT_EMOJI[task.category][size];
    const plant: Plant = {
      id: uid(),
      emoji,
      size,
      category: task.category,
      customCategory: task.category === 'other' ? task.customCategory?.trim() || undefined : undefined,
      plantedAt: Date.now(),
      taskTitle: task.title,
      x: 7 + Math.random() * 86,
      y: 12 + Math.random() * 76,
    };
    const all = await storageService.getPlants();
    await storageService.savePlants([...all, plant]);
    return plant;
  },

  async clear(): Promise<void> {
    await storageService.savePlants([]);
  },
};

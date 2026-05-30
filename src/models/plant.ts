import type { TaskCategory } from './task';

export type PlantSize = 'small' | 'medium' | 'large';

export interface Plant {
  id: string;
  emoji: string;
  size: PlantSize;
  category: TaskCategory;
  /** Epoch ms when planted. */
  plantedAt: number;
  /** Title of the task that earned it. */
  taskTitle: string;
  /** Position inside the garden plot, as % (0..100). */
  x: number;
  y: number;
}

import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@/models/task';
import { storageService } from '@/services/storage.service';
import { STORAGE_KEYS } from '@/utils/constants';
import { uid } from '@/utils/id';

export interface NewTaskInput {
  title: string;
  description?: string;
  estimatedMinutes: number;
  priority: Task['priority'];
  category: Task['category'];
  customCategory?: string;
  isBreak?: boolean;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void storageService.getTasks().then((t) => {
      if (!cancelled) {
        setTasks(t);
        setLoading(false);
      }
    });

    const unsubscribe = storageService.subscribe<Task[]>(STORAGE_KEYS.tasks, (value) => {
      setTasks(value ?? []);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const addTask = useCallback(async (input: NewTaskInput): Promise<Task> => {
    const newTask: Task = {
      id: uid(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      estimatedMinutes: input.estimatedMinutes,
      priority: input.priority,
      category: input.category,
      customCategory: input.category === 'other' ? input.customCategory?.trim() || undefined : undefined,
      status: 'pending',
      createdAt: Date.now(),
      actualSeconds: 0,
      extensions: [],
      isBreak: input.isBreak,
    };
    await storageService.upsertTask(newTask);
    return newTask;
  }, []);

  const updateTask = useCallback(async (task: Task): Promise<void> => {
    await storageService.upsertTask(task);
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    await storageService.deleteTask(taskId);
  }, []);

  return { tasks, loading, addTask, updateTask, deleteTask };
}

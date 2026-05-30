import type { Task } from '@/models/task';
import { totalEstimatedSeconds, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/models/task';
import { REASONS_BY_TYPE } from '@/models/reason';

const HEADERS = [
  'Date',
  'Title',
  'Description',
  'Category',
  'Priority',
  'Status',
  'IsBreak',
  'EstimatedMinutes',
  'ActualMinutes',
  'TotalEstimatedMinutes',
  'DriftMinutes',
  'Extensions',
  'ExtensionReasons',
];

function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function taskToRow(task: Task): string {
  const actualMinutes = Math.round(task.actualSeconds / 60);
  const totalEstimated = totalEstimatedSeconds(task) / 60;
  const drift = actualMinutes - totalEstimated;

  const reasonsList = task.extensions
    .map((e) => REASONS_BY_TYPE[e.reason]?.label ?? e.reason)
    .join(' | ');

  const cells = [
    new Date(task.createdAt).toISOString(),
    task.title,
    task.description ?? '',
    CATEGORY_LABELS[task.category],
    PRIORITY_LABELS[task.priority],
    STATUS_LABELS[task.status],
    task.isBreak ? 'yes' : 'no',
    task.estimatedMinutes,
    actualMinutes,
    totalEstimated,
    Math.round(drift),
    task.extensions.length,
    reasonsList,
  ];
  return cells.map(escape).join(',');
}

export const exportService = {
  /**
   * Download the full task history as a CSV file. UTF-8 with BOM so Excel
   * opens it with the right encoding by default.
   */
  downloadTasksCSV(tasks: Task[]): void {
    const sorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
    const lines = [HEADERS.join(','), ...sorted.map(taskToRow)];
    const csv = '﻿' + lines.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusand-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

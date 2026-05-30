import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  isTerminal,
  type Task,
} from '@/models/task';
import { formatDurationShort } from '@/utils/time';

interface Props {
  task: Task;
  hasActiveTimer: boolean;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskItem({ task, hasActiveTimer, onStart, onEdit, onDelete }: Props) {
  const terminal = isTerminal(task.status);

  return (
    <article
      className={`task-item priority-${task.priority} status-${task.status} ${task.isBreak ? 'task-item--break' : ''}`}
    >
      <div className="task-item__main">
        <div className="task-item__top">
          <h3 className="task-item__title">{task.title}</h3>
          <span className={`badge badge--priority-${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
        {task.description && <p className="task-item__desc">{task.description}</p>}
        <div className="task-item__meta">
          <span className="meta-chip">⏱ {task.estimatedMinutes} min</span>
          <span className="meta-chip">{CATEGORY_LABELS[task.category]}</span>
          {terminal && (
            <span className={`meta-chip meta-chip--status status-${task.status}`}>
              {STATUS_LABELS[task.status]} · {formatDurationShort(task.actualSeconds)}
            </span>
          )}
        </div>
      </div>
      <div className="task-item__actions">
        {!terminal && (
          <button
            className="btn btn--primary btn--sm"
            onClick={onStart}
            disabled={hasActiveTimer}
            title={hasActiveTimer ? 'Une tâche est déjà en cours' : 'Démarrer'}
          >
            ▶
          </button>
        )}
        <button className="btn btn--ghost btn--sm" onClick={onEdit} aria-label="Modifier">
          ✎
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onDelete} aria-label="Supprimer">
          ✕
        </button>
      </div>
    </article>
  );
}

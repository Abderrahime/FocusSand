import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ICONS,
  categoryLabel,
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
  const statusTone =
    task.status === 'completed_early'
      ? 'early'
      : task.status === 'completed_ontime'
        ? 'ontime'
        : task.status === 'completed_late'
          ? 'late'
          : task.status === 'abandoned'
            ? 'abandon'
            : '';

  return (
    <article
      className={`task-item priority-${task.priority} status-${task.status} ${terminal ? 'task-item--done' : ''} ${task.isBreak ? 'task-item--break' : ''}`}
    >
      <div className="task-item__main">
        <div className="task-item__top">
          <h3 className="task-item__title">{task.title}</h3>
          <span className={`badge badge--priority-${task.priority}`} title={`Priorité ${PRIORITY_LABELS[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
        {task.description && <p className="task-item__desc">{task.description}</p>}
        <div className="task-item__meta">
          <span className="meta-chip"><ClockIcon /> {task.estimatedMinutes} min</span>
          <span className="meta-chip">{categoryLabel(task)}</span>
          {terminal && (
            <span className={`meta-chip meta-chip--status status-${task.status} status-tone-${statusTone}`}>
              {STATUS_ICONS[task.status] ? `${STATUS_ICONS[task.status]} ` : ''}
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
            <PlayIcon />
          </button>
        )}
        <button className="icon-btn" onClick={onEdit} aria-label="Modifier">
          <EditIcon />
        </button>
        <button className="icon-btn" onClick={onDelete} aria-label="Supprimer">
          <XIcon />
        </button>
      </div>
    </article>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

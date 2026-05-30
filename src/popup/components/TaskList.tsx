import type { Task } from '@/models/task';
import { isTerminal } from '@/models/task';
import { TaskItem } from './TaskItem';

interface Props {
  tasks: Task[];
  hasActiveTimer: boolean;
  onStart: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, hasActiveTimer, onStart, onEdit, onDelete }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden>📝</div>
        <p>Aucune tâche pour aujourd'hui.</p>
        <p className="empty-state__hint">Ajoutez votre première tâche pour commencer.</p>
      </div>
    );
  }

  const active = tasks.filter((t) => !isTerminal(t.status));
  const done = tasks.filter((t) => isTerminal(t.status));

  return (
    <div className="task-list">
      {active.length > 0 && (
        <section>
          <h2 className="section-title">À faire ({active.length})</h2>
          {active.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              hasActiveTimer={hasActiveTimer}
              onStart={() => onStart(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          ))}
        </section>
      )}
      {done.length > 0 && (
        <section>
          <h2 className="section-title section-title--muted">Terminées ({done.length})</h2>
          {done.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              hasActiveTimer={hasActiveTimer}
              onStart={() => onStart(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

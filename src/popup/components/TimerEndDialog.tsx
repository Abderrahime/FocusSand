import type { Task } from '@/models/task';
import { formatDurationShort } from '@/utils/time';

interface Props {
  task: Task;
  elapsedSeconds: number;
  onComplete: () => void;
  onExtend: () => void;
  onAbandon: () => void;
}

export function TimerEndDialog({ task, elapsedSeconds, onComplete, onExtend, onAbandon }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal__icon" aria-hidden>⏰</div>
        <h2 className="modal__title">Le temps estimé est écoulé</h2>
        <p className="modal__body">
          Vous avez passé <strong>{formatDurationShort(elapsedSeconds)}</strong> sur
          {' '}<strong>« {task.title} »</strong>.<br />
          Où en êtes-vous ?
        </p>
        <div className="modal__actions modal__actions--stack">
          <button className="btn btn--success" onClick={onComplete}>
            ✅ Tâche terminée
          </button>
          <button className="btn btn--primary" onClick={onExtend}>
            ➕ Ajouter du temps
          </button>
          <button className="btn btn--ghost" onClick={onAbandon}>
            ⏹ Abandonner
          </button>
        </div>
      </div>
    </div>
  );
}

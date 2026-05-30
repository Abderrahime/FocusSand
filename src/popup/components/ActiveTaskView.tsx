import type { Task } from '@/models/task';
import { totalEstimatedSeconds } from '@/models/task';
import type { ActiveTimerState } from '@/models/timer';
import type { SandPack, TimerStyle } from '@/models/settings';
import { CircularTimer } from './CircularTimer';
import { Hourglass } from './Hourglass';

interface Props {
  task: Task;
  timer: ActiveTimerState;
  elapsedSeconds: number;
  style: TimerStyle;
  sandPack: SandPack;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onAbandon: () => void;
}

export function ActiveTaskView({
  task,
  timer,
  elapsedSeconds,
  style,
  sandPack,
  onPause,
  onResume,
  onComplete,
  onAbandon,
}: Props) {
  const estimated = totalEstimatedSeconds(task);

  return (
    <section className="active-task" aria-live="polite">
      <div className="active-task__header">
        <span className="active-task__chip">Tâche en cours</span>
        <h2 className="active-task__title">{task.title}</h2>
        {task.description && (
          <p className="active-task__desc">{task.description}</p>
        )}
      </div>

      {style === 'hourglass' ? (
        <Hourglass
          elapsedSeconds={elapsedSeconds}
          estimatedSeconds={estimated}
          paused={timer.isPaused}
          sandPack={sandPack}
        />
      ) : (
        <CircularTimer
          elapsedSeconds={elapsedSeconds}
          estimatedSeconds={estimated}
          paused={timer.isPaused}
        />
      )}

      <div className="active-task__actions">
        {timer.isPaused ? (
          <button className="btn btn--primary" onClick={onResume}>Reprendre</button>
        ) : (
          <button className="btn btn--secondary" onClick={onPause}>Pause</button>
        )}
        <button className="btn btn--success" onClick={onComplete}>Terminer</button>
        <button className="btn btn--ghost" onClick={onAbandon}>Abandonner</button>
      </div>

      {task.extensions.length > 0 && (
        <div className="active-task__extensions">
          <strong>Ajouts de temps :</strong>{' '}
          {task.extensions.map((e) => `+${e.addedMinutes}min`).join(', ')}
        </div>
      )}
    </section>
  );
}

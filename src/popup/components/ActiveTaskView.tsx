import type { Task } from '@/models/task';
import { totalEstimatedSeconds } from '@/models/task';
import type { ActiveTimerState } from '@/models/timer';
import type { SandPack, TimerStyle } from '@/models/settings';
import { formatDuration } from '@/utils/time';
import { CircularTimer } from './CircularTimer';
import { Hourglass } from './Hourglass';

interface Props {
  task: Task;
  timer: ActiveTimerState;
  elapsedSeconds: number;
  style: TimerStyle;
  sandPack: SandPack;
  dark: boolean;
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
  dark,
  onPause,
  onResume,
  onComplete,
  onAbandon,
}: Props) {
  const estimated = totalEstimatedSeconds(task);
  const safeEstimated = Math.max(1, estimated);
  const remainingSeconds = estimated - elapsedSeconds;
  const over = remainingSeconds < 0;
  const progress = Math.min(100, Math.max(0, Math.round((elapsedSeconds / safeEstimated) * 100)));

  return (
    <section className="active-task" aria-live="polite">
      <div className="active-task__header">
        <span className="active-task__chip">● Tâche en cours</span>
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
          dark={dark}
        />
      ) : (
        <CircularTimer
          elapsedSeconds={elapsedSeconds}
          estimatedSeconds={estimated}
          paused={timer.isPaused}
        />
      )}

      {style === 'hourglass' && (
        <div className="active-task__readout">
          <strong>{over ? `+${formatDuration(-remainingSeconds)}` : formatDuration(remainingSeconds)}</strong>
          <span className={over ? 'is-over' : ''}>{over ? 'Temps dépassé' : `${progress}% écoulé`}</span>
        </div>
      )}

      <div className="active-task__actions">
        {timer.isPaused ? (
          <button className="btn btn--soft" onClick={onResume}>Reprendre</button>
        ) : (
          <button className="btn btn--soft" onClick={onPause}>Pause</button>
        )}
        <button className="btn btn--success" onClick={onComplete}>Terminer</button>
        <button className="btn btn--danger-ghost" onClick={onAbandon}>Abandonner</button>
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

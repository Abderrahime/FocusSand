import { formatDuration } from '@/utils/time';

interface Props {
  elapsedSeconds: number;
  estimatedSeconds: number;
  paused?: boolean;
}

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularTimer({ elapsedSeconds, estimatedSeconds, paused = false }: Props) {
  const safeEstimated = Math.max(1, estimatedSeconds);
  const rawProgress = elapsedSeconds / safeEstimated;
  const progress = Math.min(1, rawProgress);
  const overrun = rawProgress > 1;

  // Color tier: green > 25% remaining, orange < 25%, red after overrun.
  const remaining = safeEstimated - elapsedSeconds;
  const remainingRatio = remaining / safeEstimated;
  let color: 'green' | 'orange' | 'red' = 'green';
  if (overrun) color = 'red';
  else if (remainingRatio <= 0.25) color = 'orange';

  const strokeColor = {
    green: 'var(--color-success)',
    orange: 'var(--color-warning)',
    red: 'var(--color-danger)',
  }[color];

  const offset = CIRCUMFERENCE * (1 - progress);

  const displaySeconds = overrun ? -(elapsedSeconds - safeEstimated) : remaining;
  const percent = Math.round(rawProgress * 100);

  return (
    <div className={`circular-timer ${paused ? 'is-paused' : ''} tone-${color}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id="ct-track" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--surface-3)" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ct-track)"
          strokeWidth={STROKE}
        />
        <circle
          className="circular-timer__progress"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="circular-timer__content">
        <div className="circular-timer__time">{formatDuration(displaySeconds)}</div>
        <div className="circular-timer__label">
          {paused ? 'En pause' : overrun ? 'Temps dépassé' : `${percent}%`}
        </div>
      </div>
    </div>
  );
}

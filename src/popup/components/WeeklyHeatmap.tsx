import { useMemo } from 'react';
import type { Task } from '@/models/task';
import { buildLastNDays, peakFocusMinutes } from '@/services/weekly.service';
import { formatDurationShort } from '@/utils/time';

interface Props {
  tasks: Task[];
  weeks?: number;
}

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Monday-start

export function WeeklyHeatmap({ tasks, weeks = 8 }: Props) {
  const days = weeks * 7;
  const buckets = useMemo(() => buildLastNDays(tasks, days), [tasks, days]);
  const peak = useMemo(() => peakFocusMinutes(buckets), [buckets]);

  // Pad the start to align the FIRST cell to a Monday (ISO week).
  // buckets[0].date is the oldest day. Compute leading empty cells so columns
  // map to (Monday, Tuesday, ...).
  const firstDate = new Date(buckets[0].date);
  // getDay(): Sunday=0..Saturday=6. We want Monday=0..Sunday=6.
  const firstDow = (firstDate.getDay() + 6) % 7;
  const leadingEmpty = firstDow;

  type Cell = { kind: 'empty' } | { kind: 'day'; idx: number };
  const cells: Cell[] = [];
  for (let i = 0; i < leadingEmpty; i++) cells.push({ kind: 'empty' });
  for (let i = 0; i < buckets.length; i++) cells.push({ kind: 'day', idx: i });

  // Arrange column-major: for each column (week), 7 rows (Mon..Sun).
  const totalCells = cells.length;
  const columns = Math.ceil(totalCells / 7);

  return (
    <section className="heatmap">
      <header className="heatmap__header">
        <h3 className="section-title">8 dernières semaines</h3>
        {peak > 0 && (
          <span className="heatmap__peak">Pic : {formatDurationShort(peak * 60)}</span>
        )}
      </header>

      <div className="heatmap__body">
        <div className="heatmap__labels">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="heatmap__day-label">{l}</span>
          ))}
        </div>
        <div className="heatmap__grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns * 7 }).map((_, idx) => {
            const col = Math.floor(idx / 7);
            const row = idx % 7;
            const cellIdx = col * 7 + row;
            const cell = cells[cellIdx];
            if (!cell || cell.kind === 'empty') {
              return <span key={idx} className="heatmap__cell heatmap__cell--empty" />;
            }
            const bucket = buckets[cell.idx];
            const minutes = Math.round(bucket.focusSeconds / 60);
            const level = levelFor(minutes, peak);
            return (
              <span
                key={idx}
                className={`heatmap__cell heatmap__cell--l${level}`}
                title={`${formatDate(bucket.date)} — ${minutes} min · ${bucket.completed} tâche(s)`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function levelFor(minutes: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (peak <= 1) return minutes > 0 ? 1 : 0;
  const ratio = minutes / peak;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

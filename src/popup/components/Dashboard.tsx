import type { DailyStats } from '@/services/stats.service';
import { exportService } from '@/services/export.service';
import { formatDurationShort } from '@/utils/time';
import type { Task } from '@/models/task';
import { WeeklyHeatmap } from './WeeklyHeatmap';

interface Props {
  stats: DailyStats;
  tasks: Task[];
}

export function Dashboard({ stats, tasks }: Props) {
  const drift = stats.driftSeconds;
  const driftLabel =
    drift === 0 ? 'à temps' : drift > 0 ? `${formatDurationShort(drift)} de retard` : `${formatDurationShort(-drift)} d'avance`;
  const driftClass = drift > 0 ? 'is-late' : drift < 0 ? 'is-early' : 'is-ontime';

  return (
    <div className="dashboard">
      <section className="score-card">
        <div className="score-card__label">Score de productivité</div>
        <div className="score-card__value">{stats.score}<span>/100</span></div>
        <div className="score-card__bar" aria-hidden>
          <div className="score-card__fill" style={{ width: `${stats.score}%` }} />
        </div>
      </section>

      <div className="kpi-grid">
        <KPI label="Tâches du jour" value={String(stats.totalTasks)} />
        <KPI label="Terminées" value={String(stats.completedTasks)} accent="success" />
        <KPI label="Abandonnées" value={String(stats.abandonedTasks)} accent="danger" />
        <KPI label="Temps estimé" value={formatDurationShort(stats.estimatedSeconds)} />
        <KPI label="Temps réel" value={formatDurationShort(stats.actualSeconds)} />
        <KPI label="Écart" value={driftLabel} className={driftClass} />
      </div>

      <section className="breakdown">
        <h3 className="section-title">Répartition</h3>
        <ul className="breakdown__list">
          <BreakdownRow label="⚡ Terminées en avance" count={stats.byStatus.completed_early} />
          <BreakdownRow label="🎯 Terminées à temps" count={stats.byStatus.completed_ontime} />
          <BreakdownRow label="🐢 Terminées en retard" count={stats.byStatus.completed_late} />
          <BreakdownRow label="■ Abandonnées" count={stats.byStatus.abandoned} tone="danger" />
        </ul>
      </section>

      <WeeklyHeatmap tasks={tasks} />

      <button
        type="button"
        className="btn btn--secondary dashboard__export"
        onClick={() => exportService.downloadTasksCSV(tasks)}
        disabled={tasks.length === 0}
      >
        ⬇ Exporter en CSV
      </button>
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: 'success' | 'danger';
  className?: string;
}) {
  return (
    <div className={`kpi-card ${accent ? `kpi-card--${accent}` : ''} ${className ?? ''}`}>
      <div className="kpi-card__value">{value}</div>
      <div className="kpi-card__label">{label}</div>
    </div>
  );
}

function BreakdownRow({ label, count, tone }: { label: string; count: number; tone?: 'danger' }) {
  return (
    <li className="breakdown__row">
      <span style={tone === 'danger' ? { color: 'var(--danger-fg)' } : undefined}>{label}</span>
      <strong>{count}</strong>
    </li>
  );
}

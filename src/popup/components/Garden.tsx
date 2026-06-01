import type { Plant } from '@/models/plant';
import { CATEGORY_LABELS } from '@/models/task';
import { CATEGORY_EMOJI } from '@/services/garden.service';

interface Props {
  plants: Plant[];
}

export function Garden({ plants }: Props) {
  if (plants.length === 0) {
    return (
      <div className="garden">
        <div className="garden__empty">
          <div className="garden__empty-icon" aria-hidden>🌱</div>
          <h2>Votre jardin attend</h2>
          <p>
            Chaque tâche que vous terminez à temps fait pousser une plante ici.
            La taille dépend du temps estimé : pousse pour les courtes, arbre pour les longues.
          </p>
        </div>
      </div>
    );
  }

  // Plants grouped by their displayed category label (custom labels included).
  const groups = plants.reduce<Record<string, { emoji: string; count: number }>>((acc, p) => {
    const label =
      p.category === 'other' && p.customCategory?.trim()
        ? p.customCategory.trim()
        : CATEGORY_LABELS[p.category];
    if (!acc[label]) acc[label] = { emoji: CATEGORY_EMOJI[p.category], count: 0 };
    acc[label].count += 1;
    return acc;
  }, {});

  return (
    <div className="garden">
      <header className="garden__header">
        <div>
          <h2 className="garden__title">{plants.length} plante{plants.length > 1 ? 's' : ''}</h2>
          <p className="garden__subtitle">cultivée{plants.length > 1 ? 's' : ''} par votre concentration</p>
        </div>
      </header>

      <div className="garden__plot">
        {plants.map((p) => (
          <span
            key={p.id}
            className={`garden__plant garden__plant--${p.size}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${p.taskTitle} — ${formatDate(p.plantedAt)}`}
          >
            {p.emoji}
          </span>
        ))}
        <div className="garden__ground" aria-hidden />
      </div>

      <div className="garden__legend">
        {Object.entries(groups).map(([label, { emoji, count }]) => (
          <div key={label} className="garden__legend-item">
            <span className="garden__legend-emoji" aria-hidden>{emoji}</span>
            <span className="garden__legend-count">{count}</span>
            <span className="garden__legend-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

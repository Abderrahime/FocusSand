import { useState } from 'react';
import { REASONS, REASONS_BY_TYPE, type ReasonType } from '@/models/reason';

interface Props {
  onConfirm: (payload: { minutes: number; reason: ReasonType; note?: string }) => void;
  onCancel: () => void;
}

export function ExtensionReasonDialog({ onConfirm, onCancel }: Props) {
  const [minutes, setMinutes] = useState(10);
  const [reason, setReason] = useState<ReasonType | null>(null);
  const [note, setNote] = useState('');

  const reasonable = REASONS.filter((r) => r.category === 'reasonable');
  const unreasonable = REASONS.filter((r) => r.category === 'unreasonable');

  const canSubmit = reason !== null && minutes > 0;

  // The whole card tints green/red depending on the chosen reason (brief #5).
  const selectedCategory = reason ? REASONS_BY_TYPE[reason].category : null;
  const tintClass =
    selectedCategory === 'reasonable'
      ? 'modal--ok'
      : selectedCategory === 'unreasonable'
        ? 'modal--bad'
        : '';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal modal--wide ${tintClass}`}>
        <h2 className="modal__title">Ajouter du temps</h2>

        <label className="form-label">
          Combien de minutes ?
          <input
            type="number"
            min={1}
            max={240}
            className="form-input"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 0))}
          />
        </label>

        <div className="form-section">
          <h3 className="form-section__title form-section__title--reasonable">
            Motifs raisonnables
          </h3>
          <div className="reason-grid">
            {reasonable.map((r) => (
              <button
                key={r.type}
                type="button"
                className={`reason-chip reason-chip--reasonable ${reason === r.type ? 'is-selected' : ''}`}
                onClick={() => setReason(r.type)}
              >
                <span aria-hidden>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section__title form-section__title--unreasonable">
            Motifs à éviter
          </h3>
          <div className="reason-grid">
            {unreasonable.map((r) => (
              <button
                key={r.type}
                type="button"
                className={`reason-chip reason-chip--unreasonable ${reason === r.type ? 'is-selected' : ''}`}
                onClick={() => setReason(r.type)}
              >
                <span aria-hidden>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>
        </div>

        <label className="form-label">
          Note (optionnel)
          <input
            type="text"
            className="form-input"
            placeholder="Précisez si besoin…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSubmit}
            onClick={() => {
              if (!reason) return;
              onConfirm({
                minutes,
                reason,
                note: note.trim() || undefined,
              });
            }}
          >
            Ajouter {minutes} min
            {reason && (
              <span className="btn__suffix">
                {' '}({REASONS_BY_TYPE[reason].emoji})
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

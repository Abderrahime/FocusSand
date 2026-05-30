import { useState, type FormEvent } from 'react';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type Task,
  type TaskCategory,
  type TaskPriority,
} from '@/models/task';

interface Props {
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export function EditTaskDialog({ task, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [category, setCategory] = useState<TaskCategory>(task.category);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || estimatedMinutes <= 0) return;
    onSave({
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedMinutes,
      priority,
      category,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal modal--wide" onSubmit={handleSubmit}>
        <h2 className="modal__title">Modifier la tâche</h2>

        <label className="form-label">
          Titre
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="form-label">
          Description
          <textarea
            className="form-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="form-label">
          Minutes estimées
          <input
            type="number"
            min={1}
            max={600}
            className="form-input"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Math.max(1, Number(e.target.value) || 0))}
          />
        </label>

        <div className="form-row">
          <label className="form-label">
            Priorité
            <select
              className="form-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Catégorie
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
          <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

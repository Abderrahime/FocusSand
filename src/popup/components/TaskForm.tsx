import { useState, type FormEvent } from 'react';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type TaskCategory,
  type TaskPriority,
} from '@/models/task';
import type { NewTaskInput } from '@/hooks/useTasks';

interface Props {
  onSubmit: (input: NewTaskInput) => unknown | Promise<unknown>;
}

export function TaskForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [customCategory, setCustomCategory] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || estimatedMinutes <= 0) return;
    await onSubmit({
      title,
      description: description || undefined,
      estimatedMinutes,
      priority,
      category,
      customCategory: category === 'other' ? customCategory.trim() || undefined : undefined,
    });
    setTitle('');
    setDescription('');
    setEstimatedMinutes(25);
    setPriority('medium');
    setCategory('work');
    setCustomCategory('');
    setExpanded(false);
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__row">
        <input
          type="text"
          className="task-form__input task-form__input--title"
          placeholder="Ajouter une tâche…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          aria-label="Titre de la tâche"
        />
        <input
          type="number"
          min={1}
          max={600}
          step={1}
          className="task-form__input task-form__input--minutes"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(Math.max(1, Number(e.target.value) || 0))}
          aria-label="Minutes estimées"
        />
        <span className="task-form__suffix">min</span>
      </div>

      {expanded && (
        <>
          <textarea
            className="task-form__input task-form__textarea"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            aria-label="Description de la tâche"
          />
          <div className="task-form__row task-form__row--select">
            <label className="task-form__field">
              <span>Priorité</span>
              <select
                className="task-form__select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label className="task-form__field">
              <span>Catégorie</span>
              <select
                className="task-form__select"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>
          </div>

          {category === 'other' && (
            <input
              type="text"
              className="task-form__input task-form__input--custom-category"
              placeholder="Préciser la catégorie (optionnel)…"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              maxLength={24}
              aria-label="Catégorie personnalisée"
            />
          )}
        </>
      )}

      <div className="task-form__actions">
        {expanded && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setExpanded(false)}
          >
            Réduire
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
          Ajouter
        </button>
      </div>
    </form>
  );
}

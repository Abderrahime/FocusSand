import { useState } from 'react';
import type { Settings, TimerStyle, SandPack, ThemeChoice } from '@/models/settings';
import type { Ambiance, AmbientSound } from '@/models/ambiance';
import { AMBIANCES, AMBIENT_SOUNDS } from '@/models/ambiance';
import { SAND_PACK_LABELS } from './Hourglass';

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
}

export function SettingsDialog({ settings, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal--wide settings">
        <h2 className="modal__title">Réglages</h2>

        <section className="settings-group">
          <h3 className="settings-group__title">Apparence</h3>
          <div className="settings-row">
            <label className="settings-label">Thème</label>
            <div className="segment">
              {(['light', 'dark', 'auto'] as ThemeChoice[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`segment__btn ${draft.theme === t ? 'is-active' : ''}`}
                  onClick={() => update('theme', t)}
                >
                  {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Auto'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <label className="settings-label">Style du timer</label>
            <div className="segment">
              {(['hourglass', 'circle'] as TimerStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`segment__btn ${draft.timerStyle === style ? 'is-active' : ''}`}
                  onClick={() => update('timerStyle', style)}
                >
                  {style === 'hourglass' ? 'Sablier' : 'Cercle'}
                </button>
              ))}
            </div>
          </div>

          {draft.timerStyle === 'hourglass' && (
            <div className="settings-row settings-row--inline">
              <label className="settings-label settings-label--small">Pack de sable</label>
              <div className="sand-pack-picker">
                {(Object.keys(SAND_PACK_LABELS) as SandPack[]).map((pack) => (
                  <button
                    key={pack}
                    type="button"
                    className={`sand-pack ${draft.sandPack === pack ? 'is-active' : ''}`}
                    onClick={() => update('sandPack', pack)}
                    title={SAND_PACK_LABELS[pack].label}
                    aria-label={SAND_PACK_LABELS[pack].label}
                  >
                    <span
                      className="sand-pack__swatch"
                      style={{ background: SAND_PACK_LABELS[pack].sample }}
                    />
                    <span className="sand-pack__label">{SAND_PACK_LABELS[pack].label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="settings-group">
          <h3 className="settings-group__title">Ambiance</h3>
          <div className="settings-row settings-row--inline">
            <label className="settings-label settings-label--small">Atmosphère</label>
            <div className="ambiance-picker">
              {AMBIANCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ambiance-pick ${draft.ambiance === a.id ? 'is-active' : ''}`}
                  onClick={() => update('ambiance', a.id as Ambiance)}
                  title={a.label}
                  aria-label={a.label}
                >
                  <span className="ambiance-pick__emoji" aria-hidden>{a.emoji}</span>
                  <span className="ambiance-pick__label">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row settings-row--inline">
            <label className="settings-label settings-label--small">Son ambiant</label>
            <div className="ambiance-picker">
              {AMBIENT_SOUNDS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ambiance-pick ${draft.ambientSound === s.id ? 'is-active' : ''}`}
                  onClick={() => update('ambientSound', s.id as AmbientSound)}
                  title={s.label}
                  aria-label={s.label}
                >
                  <span className="ambiance-pick__emoji" aria-hidden>{s.emoji}</span>
                  <span className="ambiance-pick__label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {draft.ambientSound !== 'none' && (
            <div className="settings-row">
              <label className="settings-label">Volume ambiant</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.ambientSoundVolume}
                onChange={(e) => update('ambientSoundVolume', Number(e.target.value))}
                className="settings-range"
              />
              <span className="settings-value">{Math.round(draft.ambientSoundVolume * 100)}%</span>
            </div>
          )}
        </section>

        <section className="settings-group">
          <h3 className="settings-group__title">Sons</h3>
          <Toggle
            label="Activer les sons"
            checked={draft.soundEnabled}
            onChange={(v) => update('soundEnabled', v)}
          />
          <div className="settings-row">
            <label className="settings-label">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.soundVolume}
              onChange={(e) => update('soundVolume', Number(e.target.value))}
              className="settings-range"
              disabled={!draft.soundEnabled}
            />
            <span className="settings-value">{Math.round(draft.soundVolume * 100)}%</span>
          </div>
          <div className="settings-row settings-row--inline">
            <span className="settings-label settings-label--small">Heures silencieuses</span>
            <HourPicker value={draft.quietHoursStart} onChange={(v) => update('quietHoursStart', v)} />
            <span className="settings-mute">à</span>
            <HourPicker value={draft.quietHoursEnd} onChange={(v) => update('quietHoursEnd', v)} />
          </div>
        </section>

        <section className="settings-group">
          <h3 className="settings-group__title">Motivation</h3>
          <Toggle
            label="Confettis à la complétion"
            checked={draft.confettiEnabled}
            onChange={(v) => update('confettiEnabled', v)}
          />
          <Toggle
            label="Bilan du jour (notification)"
            checked={draft.dailySummary}
            onChange={(v) => update('dailySummary', v)}
          />
          {draft.dailySummary && (
            <div className="settings-row settings-row--inline">
              <span className="settings-label settings-label--small">Heure du bilan</span>
              <HourPicker value={draft.dailySummaryHour} onChange={(v) => update('dailySummaryHour', v)} />
            </div>
          )}
        </section>

        <section className="settings-group">
          <h3 className="settings-group__title">Focus</h3>
          <Toggle
            label="Détecter les sites distrayants"
            checked={draft.distractionDetection}
            onChange={(v) => update('distractionDetection', v)}
            hint="YouTube, Instagram, TikTok, X, Facebook, Netflix."
          />
          <Toggle
            label="Boutons de pause Pomodoro"
            checked={draft.pomodoroBreaks}
            onChange={(v) => update('pomodoroBreaks', v)}
            hint="Affiche des raccourcis pour démarrer une pause courte ou longue."
          />
          {draft.pomodoroBreaks && (
            <div className="settings-row settings-row--inline">
              <span className="settings-label settings-label--small">Pause courte</span>
              <input
                type="number"
                min={1}
                max={60}
                className="form-input settings-hour"
                value={draft.shortBreakMinutes}
                onChange={(e) => update('shortBreakMinutes', Math.max(1, Number(e.target.value) || 0))}
              />
              <span className="settings-mute">min</span>
              <span className="settings-label settings-label--small">Pause longue</span>
              <input
                type="number"
                min={1}
                max={120}
                className="form-input settings-hour"
                value={draft.longBreakMinutes}
                onChange={(e) => update('longBreakMinutes', Math.max(1, Number(e.target.value) || 0))}
              />
              <span className="settings-mute">min</span>
            </div>
          )}
        </section>

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn--primary" onClick={() => onSave(draft)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <div className="toggle-row__text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__knob" />
      </button>
    </label>
  );
}

function HourPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      className="form-input settings-hour"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {Array.from({ length: 24 }).map((_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}h
        </option>
      ))}
    </select>
  );
}

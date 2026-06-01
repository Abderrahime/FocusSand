import type { Ambiance, AmbientSound } from './ambiance';

export type TimerStyle = 'hourglass' | 'circle';

export type SandPack = 'classic' | 'lava' | 'glacier' | 'emerald' | 'gold' | 'rune';

export type ThemeChoice = 'light' | 'dark' | 'auto';

export interface Settings {
  /** Light, dark, or follow system. */
  theme: ThemeChoice;

  /** Visual style for the active timer. */
  timerStyle: TimerStyle;

  /** Visual color pack for the sand. */
  sandPack: SandPack;

  /** Visual atmosphere applied as background + particle overlay. */
  ambiance: Ambiance;

  /** Looping background sound played while a task is running. */
  ambientSound: AmbientSound;
  ambientSoundVolume: number;

  /** Show Pomodoro break buttons. */
  pomodoroBreaks: boolean;
  shortBreakMinutes: number;
  longBreakMinutes: number;

  /** Master sound switch. */
  soundEnabled: boolean;

  /** Volume from 0 to 1. */
  soundVolume: number;

  /** Quiet hours: no notifications nor sounds between these hours (24h). */
  quietHoursStart: number; // 0-23, e.g. 22
  quietHoursEnd: number;   // 0-23, e.g. 8

  /** Show confetti on on-time/early completion. */
  confettiEnabled: boolean;

  /** Watch distracting domains during a running task. */
  distractionDetection: boolean;

  /** End-of-day summary notification. */
  dailySummary: boolean;
  /** Hour of day (0-23) for the summary. */
  dailySummaryHour: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  timerStyle: 'hourglass',
  sandPack: 'classic',
  ambiance: 'none',
  ambientSound: 'none',
  ambientSoundVolume: 0.25,
  pomodoroBreaks: true,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
  soundVolume: 0.4,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  confettiEnabled: true,
  distractionDetection: true,
  dailySummary: true,
  dailySummaryHour: 18,
};

export function isQuietHour(now: Date, settings: Settings): boolean {
  const hour = now.getHours();
  const { quietHoursStart: start, quietHoursEnd: end } = settings;
  if (start === end) return false;
  // Range that crosses midnight (e.g. 22 → 8).
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

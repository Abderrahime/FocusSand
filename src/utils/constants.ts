export const STORAGE_KEYS = {
  tasks: 'fs.tasks',
  activeTimer: 'fs.activeTimer',
  settings: 'fs.settings',
  streak: 'fs.streak',
  /** Tracks last domain we already notified about (debounce). */
  distractionMemo: 'fs.distractionMemo',
  /** Transient: popup asks side panel to auto-open the PiP on mount. */
  pendingPipRequest: 'fs.pendingPipRequest',
  /** Transient: popup asks the mini-window to auto-open the PiP on mount. */
  autoOpenPipOnMini: 'fs.autoOpenPipOnMini',
  /** Garden of plants earned by completed tasks. */
  garden: 'fs.garden',
} as const;

export const ALARM_NAMES = {
  timerEnd: 'fs.timerEnd',
  tenMinutesLeft: 'fs.tenMinutesLeft',
  badgeTick: 'fs.badgeTick',
  dailySummary: 'fs.dailySummary',
} as const;

export const MESSAGES = {
  scheduleTimerEnd: 'fs.scheduleTimerEnd',
  cancelTimerEnd: 'fs.cancelTimerEnd',
  scheduleTenMinutesLeft: 'fs.scheduleTenMinutesLeft',
  cancelTenMinutesLeft: 'fs.cancelTenMinutesLeft',
  refreshBadge: 'fs.refreshBadge',
  rescheduleSummary: 'fs.rescheduleSummary',
} as const;

/** Sites considérés comme distrayants (pour la fonctionnalité future). */
export const DISTRACTING_DOMAINS: readonly string[] = [
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'netflix.com',
  'x.com',
];

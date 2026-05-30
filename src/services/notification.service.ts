import type { Task } from '@/models/task';

/**
 * Thin wrapper around chrome.notifications. Safe to call from the
 * service worker; the popup can also call it indirectly via messaging.
 */
export const notificationService = {
  timerEnded(task: Task): void {
    chrome.notifications.create(`timer-end-${task.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'FocusSand — temps écoulé',
      message: `Le temps estimé pour « ${task.title} » est écoulé. Ouvrez la popup pour faire le point.`,
      priority: 2,
    });
  },

  distractionDetected(task: Task, domain: string): void {
    chrome.notifications.create(`distraction-${task.id}-${domain}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'FocusSand — distraction détectée',
      message: `Vous êtes sur ${domain} alors que « ${task.title} » est en cours. Restez focus !`,
      priority: 1,
    });
  },
};

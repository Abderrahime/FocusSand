import { useEffect, useState } from 'react';
import type { ThemeChoice } from '@/models/settings';

/**
 * Resolves the effective theme from a user choice ("light" | "dark" | "auto")
 * and the OS preference, then writes `data-theme` on the document element so
 * CSS variables can react.
 *
 * Mounted in every entry context (popup, side panel, detached, PiP) so each
 * surface keeps its own up-to-date theme.
 */
export function useTheme(choice: ThemeChoice): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved: 'light' | 'dark' = choice === 'auto' ? (systemDark ? 'dark' : 'light') : choice;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  return resolved;
}

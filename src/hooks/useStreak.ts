import { useEffect, useState } from 'react';
import { EMPTY_STREAK, type Streak } from '@/models/streak';
import { storageService } from '@/services/storage.service';
import { streakService } from '@/services/streak.service';
import { STORAGE_KEYS } from '@/utils/constants';

export function useStreak(): Streak {
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const s = await streakService.getDisplay();
      if (!cancelled) setStreak(s);
    };

    void refresh();
    const unsub = storageService.subscribe<Streak>(STORAGE_KEYS.streak, () => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return streak;
}

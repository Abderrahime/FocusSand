import { useEffect, useState } from 'react';
import type { Plant } from '@/models/plant';
import { storageService } from '@/services/storage.service';
import { STORAGE_KEYS } from '@/utils/constants';

export function useGarden(): Plant[] {
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    let cancelled = false;
    void storageService.getPlants().then((p) => {
      if (!cancelled) setPlants(p);
    });
    const unsub = storageService.subscribe<Plant[]>(STORAGE_KEYS.garden, (value) => {
      setPlants(value ?? []);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return plants;
}

import { useState, useEffect } from 'react';
import { getJsonFromLocalStorage } from '@/utils/storageHelpers';
import type { CosmeticCategory } from '@/lib/cosmetics';

const EQUIPPED_KEY = 'lexiclash_cosmetics_equipped';

export function useEquippedCosmetic(category: CosmeticCategory): string | null {
  const [equipped, setEquipped] = useState<string | null>(() => {
    const stored = getJsonFromLocalStorage<Partial<Record<CosmeticCategory, string>>>(
      EQUIPPED_KEY, {}
    );
    return stored[category] ?? null;
  });

  useEffect(() => {
    const handler = () => {
      const stored = getJsonFromLocalStorage<Partial<Record<CosmeticCategory, string>>>(
        EQUIPPED_KEY, {}
      );
      setEquipped(stored[category] ?? null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [category]);

  return equipped;
}

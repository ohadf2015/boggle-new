'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SKIN_ID,
  isSkinUnlocked,
  skinPalette,
  type TowerSkinId,
} from '@/lib/wordTower/skins';
import type { ZoneMaterialPalette } from '@/lib/wordTower/blockGrade';

export const TOWER_SKIN_STORAGE_KEY = 'wordTower_skin';

function readStored(): TowerSkinId | null {
  try {
    return (localStorage.getItem(TOWER_SKIN_STORAGE_KEY) as TowerSkinId) || null;
  } catch {
    return null; // SSR / privacy mode — fall back to default
  }
}

export interface UseTowerSkin {
  skinId: TowerSkinId;
  /** Active material palette — feed straight to the Scene + crane/minimap. */
  palette: ZoneMaterialPalette;
  /** Equip a skin. No-op (stays put) if the player hasn't unlocked it. */
  setSkinId: (id: TowerSkinId) => void;
  /** Is this skin unlocked at the current personal best? */
  isUnlocked: (id: TowerSkinId) => boolean;
}

/**
 * Persisted tower-skin selection, gated by personal-best height. A stored skin
 * the player can't (yet) own is ignored — so tampering localStorage or a config
 * change can never equip a locked look. `bestHeightM` is the player's all-time
 * best (live max), which only grows, so unlock state is monotonic.
 */
export function useTowerSkin(bestHeightM: number): UseTowerSkin {
  const [skinId, setSkin] = useState<TowerSkinId>(DEFAULT_SKIN_ID);

  // Hydrate from storage once on mount (guarded for SSR / locked skins).
  useEffect(() => {
    const stored = readStored();
    if (stored && stored !== DEFAULT_SKIN_ID && isSkinUnlocked(stored, bestHeightM)) {
      setSkin(stored);
    }
    // bestHeightM intentionally read once at mount — equipping is user-driven
    // afterwards; we don't want a later height bump to silently swap the look.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setSkinId = useCallback((id: TowerSkinId) => {
    if (!isSkinUnlocked(id, bestHeightM)) return; // can't equip what you haven't earned
    setSkin(id);
    try { localStorage.setItem(TOWER_SKIN_STORAGE_KEY, id); } catch { /* ignore */ }
  }, [bestHeightM]);

  const isUnlocked = useCallback((id: TowerSkinId) => isSkinUnlocked(id, bestHeightM), [bestHeightM]);

  const palette = useMemo(() => skinPalette(skinId), [skinId]);

  return { skinId, palette, setSkinId, isUnlocked };
}

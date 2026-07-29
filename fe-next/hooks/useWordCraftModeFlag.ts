'use client';

import { useMemo } from 'react';

export type WordCraftMode = 'territory' | 'gems' | 'cards';

/**
 * Reads `?mode=` query param. Default is 'territory' (the only public mode).
 * - `?mode=gems` opens Gem Hunt
 * - `?mode=cards` opens the power-card Run mode (formerly behind a flag)
 * - `?mode=territory` explicit territory
 *
 * The legacy Scrabble-alt "classic" variant was retired — Territory is the one
 * WordCraft ruleset. Stale `?classic=1` / `?mode=classic` links resolve to
 * Territory.
 */
export function useWordCraftMode(): WordCraftMode {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'territory';
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'gems') return 'gems';
    if (mode === 'cards') return 'cards';
    return 'territory';
  }, []);
}

/**
 * Public-mode gate. Only **Territory** is public; the Cards Run and Gem Hunt
 * sub-modes stay reachable solely as admin-only dev previews. Non-admins
 * requesting them fall back to Territory.
 */
export function gateWordCraftMode(mode: WordCraftMode, isAdmin: boolean): WordCraftMode {
  if (!isAdmin && (mode === 'cards' || mode === 'gems')) return 'territory';
  return mode;
}

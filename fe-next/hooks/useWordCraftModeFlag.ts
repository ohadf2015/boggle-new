'use client';

import { useMemo } from 'react';

export type WordCraftMode = 'territory' | 'gems' | 'classic' | 'cards';

/**
 * Reads `?mode=` query param. Default is 'territory' (the live default twist).
 * - `?mode=gems` opens Gem Hunt
 * - `?mode=cards` opens the power-card Run mode (formerly behind a flag)
 * - `?mode=territory` explicit territory
 * - `?classic=1` legacy Scrabble-alt (no claims, no gems) — back-compat
 */
export function useWordCraftMode(): WordCraftMode {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'territory';
    const params = new URLSearchParams(window.location.search);
    if (params.get('classic') === '1' || params.get('classic') === 'true') return 'classic';
    const mode = params.get('mode');
    if (mode === 'gems') return 'gems';
    if (mode === 'cards') return 'cards';
    if (mode === 'classic') return 'classic';
    return 'territory';
  }, []);
}

/**
 * Public-mode gate. Only **Territory** (and its legacy `classic` toggle) is
 * public; the Cards Run and Gem Hunt sub-modes stay reachable solely as
 * admin-only dev previews. Non-admins requesting them fall back to Territory.
 */
export function gateWordCraftMode(mode: WordCraftMode, isAdmin: boolean): WordCraftMode {
  if (!isAdmin && (mode === 'cards' || mode === 'gems')) return 'territory';
  return mode;
}

'use client';

import { useMemo } from 'react';

export type WordCraftMode = 'territory' | 'gems' | 'classic';

/**
 * Reads `?mode=` query param. Default is 'territory' (the live default twist).
 * - `?mode=gems` opens Gem Hunt
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
    if (mode === 'classic') return 'classic';
    return 'territory';
  }, []);
}

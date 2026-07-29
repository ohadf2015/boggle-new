'use client';

/**
 * useGameStartTelemetry — emit `growth:game_started` once per mount on the
 * rising edge of `isGameActive` (or immediately if it starts true).
 *
 * Why: MP surfaces (host/player views) never called `trackGameStart`, only
 * `trackGameEnd`. PostHog 30d: `growth:game_started` 56 vs `growth:game_completed`
 * 120 — funnels for "MP started → finished" returned blank. Centralizing the
 * rising-edge detection keeps the contract: one start per mount, one end per
 * mount, mode/extras propagated to PostHog.
 */

import { useEffect, useRef } from 'react';
import { trackGameStart } from '@/utils/growthTracking';

interface UseGameStartTelemetryArgs {
  /** Engine mode (e.g. 'multiplayer', 'word-hunt', 'blast', 'wheel-rush'). Required — null/undefined skips emit so we never pollute funnel with mode=null. */
  mode: string | undefined | null;
  /** True when the game is in the playing phase (not lobby, not results). */
  isGameActive: boolean;
  /** Optional disambiguators forwarded to PostHog (gameCode, subMode, botCount, etc). */
  extras?: Record<string, unknown>;
}

export function useGameStartTelemetry({ mode, isGameActive, extras }: UseGameStartTelemetryArgs): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!isGameActive) return;
    if (!mode) return;

    firedRef.current = true;
    trackGameStart(mode, extras ?? {});
  }, [mode, isGameActive, extras]);
}

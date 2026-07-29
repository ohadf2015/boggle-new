'use client';

/**
 * useGameEndTelemetry — emit `game_completed` once per mount on the rising edge
 * of `resultsShown`. Pairs with useGameStartTelemetry so MP "started → finished"
 * funnels are computable per gameMode.
 *
 * Why: MP host/player views fired `game_started` (via useGameStartTelemetry) but
 * never `game_completed` — the paired end emit the start hook's comment referenced
 * did not actually exist, so the nightly job could see MP starts but no MP
 * outcomes per mode. This closes that gap. Mode + extras (gameMode, isMultiplayer,
 * playerCount) propagate to PostHog so the nightly intelligence suite can split
 * MP rounds by mode.
 */

import { useEffect, useRef } from 'react';
import { trackGameEnd } from '@/utils/growthTracking';

interface UseGameEndTelemetryArgs {
  /** Resolved gameMode (e.g. 'blast'). Null/undefined skips emit so we never pollute funnel with mode=null. */
  mode: string | undefined | null;
  /** True once the post-game results phase is reached. */
  resultsShown: boolean;
  score: number;
  wordCount: number;
  durationSec?: number;
  /** Optional disambiguators forwarded to PostHog (isMultiplayer, gameMode, playerCount, gameCode, role). */
  extras?: Record<string, unknown>;
}

export function useGameEndTelemetry({
  mode, resultsShown, score, wordCount, durationSec, extras,
}: UseGameEndTelemetryArgs): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!resultsShown) return;
    if (!mode) return;

    firedRef.current = true;
    trackGameEnd(mode, score, wordCount, true, durationSec, extras ?? {});
  }, [mode, resultsShown, score, wordCount, durationSec, extras]);
}

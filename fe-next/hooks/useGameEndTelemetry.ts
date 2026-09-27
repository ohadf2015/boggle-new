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
  /**
   * Gate the emit until the mode is authoritative. Defaults true. Mirrors the
   * identical option on `useGameStartTelemetry` — MP rolls `random` server-side
   * and the resolved mode arrives after the game goes active, so the START hook
   * waited for `gameModeConfirmed` while this one did not. The result was
   * `game_completed` with mode='random' and no matching start: PostHog 30d
   * showed random with 0 starts against 8 completions. Both ends gate on the
   * same signal now (Class 3 in `.claude/rules/60-recurring-pitfalls.md`).
   */
  ready?: boolean;
  score: number;
  wordCount: number;
  durationSec?: number;
  /** Optional disambiguators forwarded to PostHog (isMultiplayer, gameMode, playerCount, gameCode, role). */
  extras?: Record<string, unknown>;
}

export function useGameEndTelemetry({
  mode, resultsShown, ready = true, score, wordCount, durationSec, extras,
}: UseGameEndTelemetryArgs): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!resultsShown) return;
    if (!ready) return;
    if (!mode) return;

    firedRef.current = true;
    trackGameEnd(mode, score, wordCount, true, durationSec, extras ?? {});
  }, [mode, resultsShown, ready, score, wordCount, durationSec, extras]);
}

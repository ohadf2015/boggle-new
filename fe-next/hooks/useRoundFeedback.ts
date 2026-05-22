import { useCallback, useState } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * useRoundFeedback — between-rounds sentiment capture for multiplayer.
 *
 * Surfaces a one-tap "how was that round?" prompt on the MP results screen
 * (the dwell window before the host starts the next round) and reports the
 * answer to PostHog via the canonical `trackGrowthEvent` pipeline.
 *
 * Gating: multiplayer + a live room (`gameCode`) + NOT the final round of a
 * best-of-three series. Non-series casual MP has no `seriesRoundNumber`, so it
 * always counts as "between rounds" — only the explicit series finale (the one
 * "game over" marker we have on the player side) is suppressed.
 *
 * Throttle: keyed on `sessionId:gameCode`, so a player is asked at most once
 * per room, never on every round.
 */

export type RoundRating = 'bad' | 'ok' | 'great';

const RATING_VALUE: Record<RoundRating, 1 | 2 | 3> = { bad: 1, ok: 2, great: 3 };

/** Best-of-three is the only series length shipped today. */
const DEFAULT_SERIES_TOTAL = 3;

export interface UseRoundFeedbackArgs {
  /** Room code — also doubles as the per-room throttle key. */
  gameCode?: string;
  gameMode?: string;
  language?: string;
  /** True when more than one player is in the match. */
  isMultiplayer: boolean;
  /** Rounds completed in the current best-of-N series, if any. */
  seriesRoundNumber?: number;
  seriesTotalGames?: number;
}

export interface UseRoundFeedbackResult {
  shouldShow: boolean;
  recordRating: (rating: RoundRating) => void;
  dismiss: () => void;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    return window.sessionStorage.getItem('lexiclash_session_id') || 'nosession';
  } catch {
    return 'nosession';
  }
}

function storageKey(gameCode: string): string {
  return `lc_round_fb_${getSessionId()}_${gameCode}`;
}

function alreadyHandled(gameCode: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(storageKey(gameCode)) === '1';
  } catch {
    return false;
  }
}

function markHandled(gameCode: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(gameCode), '1');
  } catch {
    /* sessionStorage unavailable (private mode / quota) — degrade silently */
  }
}

export function useRoundFeedback({
  gameCode,
  gameMode,
  language,
  isMultiplayer,
  seriesRoundNumber,
  seriesTotalGames,
}: UseRoundFeedbackArgs): UseRoundFeedbackResult {
  const isSeriesComplete =
    seriesRoundNumber != null &&
    seriesRoundNumber >= (seriesTotalGames ?? DEFAULT_SERIES_TOTAL);

  const eligible = isMultiplayer && !!gameCode && !isSeriesComplete;

  // Lazy initializer reads the persisted "answered this room" flag once, so a
  // remount of the results tree doesn't re-prompt a player who already replied.
  const [dismissed, setDismissed] = useState<boolean>(() =>
    eligible && gameCode ? alreadyHandled(gameCode) : true,
  );

  const recordRating = useCallback(
    (rating: RoundRating) => {
      if (gameCode) markHandled(gameCode);
      trackGrowthEvent('mp_round_feedback', {
        rating,
        ratingValue: RATING_VALUE[rating],
        gameMode,
        seriesRound: seriesRoundNumber,
        gameCode,
        language,
      });
    },
    [gameCode, gameMode, seriesRoundNumber, language],
  );

  const dismiss = useCallback(() => {
    if (gameCode) markHandled(gameCode);
    setDismissed(true);
  }, [gameCode]);

  return { shouldShow: eligible && !dismissed, recordRating, dismiss };
}

export default useRoundFeedback;

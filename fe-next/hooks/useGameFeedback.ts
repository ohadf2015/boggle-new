import { useEffect, useRef, useState, useCallback } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  noteGameSeen,
  canPromptGlobally,
  markPrompted,
  surfaceHandledThisSession,
  markSurfaceHandled,
} from '@/lib/feedback/feedbackThrottle';

/**
 * useGameFeedback — one-tap end-of-game sentiment capture, shared across surfaces.
 *
 * Reports the answer to PostHog as a single `game_feedback` event tagged with a
 * `surface`, so the nightly improvement loop can read all in-game sentiment with
 * one query. Anti-annoyance budget (global cooldown + min-games + per-surface
 * session de-dupe) lives in `lib/feedback/feedbackThrottle`.
 *
 * The caller supplies `eligible` — the surface-specific gate (e.g. for MP:
 * multiplayer + live room + not the series finale). The shared throttle decides
 * the rest.
 */

export type FeedbackSurface = 'mp_round' | 'singleplayer' | 'daily' | 'word_hunt';

export type FeedbackRating = 'bad' | 'ok' | 'great';

const RATING_VALUE: Record<FeedbackRating, 1 | 2 | 3> = { bad: 1, ok: 2, great: 3 };

export interface UseGameFeedbackArgs {
  surface: FeedbackSurface;
  /** Surface-specific eligibility gate, computed by the caller. */
  eligible: boolean;
  gameMode?: string;
  language?: string;
  /** Disambiguates the per-session de-dupe key (room code, session id, date…). */
  throttleKey?: string;
}

export interface UseGameFeedbackResult {
  shouldShow: boolean;
  recordRating: (rating: FeedbackRating) => void;
  dismiss: () => void;
}

export function useGameFeedback({
  surface,
  eligible,
  gameMode,
  language,
  throttleKey,
}: UseGameFeedbackArgs): UseGameFeedbackResult {
  const [shouldShow, setShouldShow] = useState(false);
  const ran = useRef(false);

  // Decide visibility once per mount, after counting this game toward the
  // min-games gate. Done in an effect (not render) so the localStorage write is
  // a real side effect and SSR stays inert.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    noteGameSeen();
    setShouldShow(
      eligible &&
        canPromptGlobally() &&
        !surfaceHandledThisSession(surface, throttleKey),
    );
    // Intentionally mount-only: eligibility is sampled at the moment the
    // end-of-game surface appears; later prop churn shouldn't pop the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    markPrompted();
    markSurfaceHandled(surface, throttleKey);
    setShouldShow(false);
  }, [surface, throttleKey]);

  const recordRating = useCallback(
    (rating: FeedbackRating) => {
      markPrompted();
      markSurfaceHandled(surface, throttleKey);
      trackGrowthEvent('game_feedback', {
        surface,
        rating,
        ratingValue: RATING_VALUE[rating],
        gameMode,
        language,
      });
    },
    [surface, throttleKey, gameMode, language],
  );

  const dismiss = useCallback(() => {
    close();
  }, [close]);

  return { shouldShow, recordRating, dismiss };
}

export default useGameFeedback;

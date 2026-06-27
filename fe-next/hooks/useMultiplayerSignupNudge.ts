/**
 * useMultiplayerSignupNudge — Non-intrusive signup nudges for MP guests
 *
 * Tracks MP session state (game count, accumulated stats) and decides
 * which nudge to show based on PostHog feature flags.
 * Hidden on CrazyGames platform.
 *
 * Nudge tiers:
 * - sheet: Bottom sheet with accumulated stats + OAuth (after N games)
 * - toast: Non-blocking toast before rematch (game 3+)
 * - pulse: Pulsing coin counter visual cue (game 5+)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { getGuestStats } from '@/utils/guestManager';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackGrowthEvent } from '@/utils/growthTracking';

// Session-scoped MP game counter (separate from global guest stats)
const MP_SESSION_GAMES_KEY = 'boggle_mp_session_games';
const MP_NUDGE_SHEET_SHOWN_KEY = 'boggle_mp_nudge_sheet_shown';
const MP_NUDGE_TOAST_SHOWN_KEY = 'boggle_mp_nudge_toast_shown';

export type NudgeType = 'sheet' | 'toast' | 'pulse' | null;

export interface AccumulatedStats {
  mpGamesThisSession: number;
  totalWords: number;
  totalScore: number;
  totalGames: number;
}

interface UseMultiplayerSignupNudgeParams {
  isAuthenticated: boolean;
  /** Whether the results screen is currently showing */
  isResultsVisible: boolean;
}

interface UseMultiplayerSignupNudgeReturn {
  /** Which nudge to show (null = none) */
  activeNudge: NudgeType;
  /** Accumulated stats for display in the nudge */
  stats: AccumulatedStats;
  /** Dismiss the current nudge */
  dismissNudge: () => void;
  /** Record an MP game completion (call from results page) */
  recordMpGame: (submode?: string) => void;
  /** Whether the coin counter should pulse */
  shouldPulseCoins: boolean;
}

function getMpSessionGames(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(sessionStorage.getItem(MP_SESSION_GAMES_KEY) || '0', 10);
}

function setMpSessionGames(count: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MP_SESSION_GAMES_KEY, String(count));
}

function wasSheetShown(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(MP_NUDGE_SHEET_SHOWN_KEY) === 'true';
}

function markSheetShown(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MP_NUDGE_SHEET_SHOWN_KEY, 'true');
}

function wasToastShown(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(MP_NUDGE_TOAST_SHOWN_KEY) === 'true';
}

function markToastShown(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MP_NUDGE_TOAST_SHOWN_KEY, 'true');
}

export function useMultiplayerSignupNudge({
  isAuthenticated,
  isResultsVisible,
}: UseMultiplayerSignupNudgeParams): UseMultiplayerSignupNudgeReturn {
  const [activeNudge, setActiveNudge] = useState<NudgeType>(null);
  const [mpGames, setMpGames] = useState<number>(getMpSessionGames);

  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // A/B test: threshold for showing the bottom sheet
  const thresholdVariant = usePostHogFlag<string>('mp-signup-nudge-threshold', 'after-2nd-game');
  const sheetThreshold = thresholdVariant === 'after-3rd-game' ? 3 : 2;

  // A/B test: copy + post-sheet toast gating. The game-3+ toast converted 0/58 in
  // 28d (see `mp-signup-nudge-copy-v1` in lib/experiments.ts), so the FALLBACK
  // default is now `toast-disabled` — unenrolled / flag-unresolved guests (the
  // pre-traction majority) no longer get the dead nag. Enrolled users still get
  // whatever the experiment serves, so an active A/B is unaffected. Flip the
  // fallback back to 'control' to re-enable by default.
  const copyVariant = usePostHogFlag<string>('mp-signup-nudge-copy-v1', 'toast-disabled');
  const toastEnabled = copyVariant !== 'toast-disabled';

  // Toast threshold is always sheet + 1
  const toastThreshold = sheetThreshold + 1;
  const pulseThreshold = 5;

  const stats: AccumulatedStats = useMemo(() => {
    const guestStats = getGuestStats();
    return {
      mpGamesThisSession: mpGames,
      totalWords: guestStats.words || 0,
      totalScore: guestStats.score || 0,
      totalGames: guestStats.games || 0,
    };
  }, [mpGames]);

  const recordMpGame = useCallback((submode?: string) => {
    setMpGames((prev) => {
      const newCount = prev + 1;
      setMpSessionGames(newCount);
      const mode = submode || 'multiplayer';
      // Dedicated nudge event — NOT `game_completed`. The real MP completion is
      // emitted by PlayerView (useGameEndTelemetry) with score/wordCount/MP
      // flags. Emitting `game_completed` here (no score, no isMultiplayer)
      // forged a phantom solo 0/0 row in the admin game log per MP game.
      trackGrowthEvent('mp_session_game', {
        mode,
        gameMode: mode,
        gameCode: undefined,
        isGuest: true,
        mpSessionGame: newCount,
      });
      return newCount;
    });
  }, []);

  const dismissNudge = useCallback(() => {
    if (activeNudge === 'sheet') {
      markSheetShown();
      trackGrowthEvent('signup_prompt_shown', {
        trigger: 'mp_sheet_dismissed',
        mpSessionGame: mpGames,
      });
    }
    setActiveNudge(null);
  }, [activeNudge, mpGames]);

  // Determine which nudge to show when results become visible
  useEffect(() => {
    // Never show for: authenticated users, CrazyGames, or when results aren't visible
    if (isAuthenticated || isOnCrazyGamesPlatform || !isResultsVisible) {
      setActiveNudge(null);
      return;
    }

    // Sheet: show once per session at threshold. Mark shown at SHOW time (not in
    // dismissNudge) so a reload/remount before the user dismisses can't re-pop it
    // (recurring-pitfalls Class 1). dismissNudge still emits mp_sheet_dismissed.
    if (mpGames >= sheetThreshold && !wasSheetShown()) {
      const timer = setTimeout(() => {
        markSheetShown();
        setActiveNudge('sheet');
        trackGrowthEvent('signup_prompt_shown', {
          trigger: 'mp_sheet',
          mpSessionGame: mpGames,
        });
      }, 2000); // 2s delay — let them see their results first
      return () => clearTimeout(timer);
    }

    // Toast: show ONCE on game 3+ (after sheet was already shown/dismissed).
    // Suppressed under `toast-disabled` variant — see copyVariant above.
    // `!wasToastShown()` caps it to one per session — without it the effect
    // re-ran on every game >= threshold and re-fired the toast (~5.8x/user, one
    // user 22x in a day; PostHog 45d). Marked at SHOW time, not dismiss time, so
    // a reload-without-dismiss can't re-pop it (recurring-pitfalls Class 1).
    if (toastEnabled && mpGames >= toastThreshold && wasSheetShown() && !wasToastShown()) {
      const timer = setTimeout(() => {
        markToastShown();
        setActiveNudge('toast');
        trackGrowthEvent('signup_prompt_shown', {
          trigger: 'mp_toast',
          mpSessionGame: mpGames,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isAuthenticated, isOnCrazyGamesPlatform, isResultsVisible, mpGames, sheetThreshold, toastThreshold, toastEnabled]);

  const shouldPulseCoins = !isAuthenticated && !isOnCrazyGamesPlatform && mpGames >= pulseThreshold;

  return {
    activeNudge,
    stats,
    dismissNudge,
    recordMpGame,
    shouldPulseCoins,
  };
}

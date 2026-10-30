/**
 * useMultiplayerSignupNudge — Tests
 *
 * Validates nudge logic: thresholds, CrazyGames hiding,
 * session tracking, PostHog event tracking.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies before imports
const mockTrackGrowthEvent = vi.fn();
// Mirror production trackSignupFunnel: event-name mapping + the sessionStorage
// pending latch that AuthContext reads for completion source attribution
// (t_da22db9a — the MP nudge now routes through it for real).
const PENDING_KEY = 'lexiclash_signup_funnel_pending';
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
  trackSignupFunnel: (step: string, _isFirstWin: boolean, props?: Record<string, unknown>) => {
    if (typeof window !== 'undefined') {
      if (step === 'prompt_shown') window.sessionStorage.setItem(PENDING_KEY, 'multi_game');
      else window.sessionStorage.removeItem(PENDING_KEY);
    }
    const name =
      step === 'prompt_shown'
        ? 'signup_prompt_shown'
        : step === 'completed'
          ? 'signup_completed'
          : 'signup_dismissed';
    mockTrackGrowthEvent(name, props);
  },
}));

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
  }),
}));

let mockFlagValue = 'after-2nd-game';
// null simulates an unresolved/unenrolled flag → the hook's fallback default applies.
let mockCopyVariant: string | null = 'control';
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (key: string, fallback?: unknown) => {
    if (key === 'mp-signup-nudge-threshold') return mockFlagValue;
    if (key === 'mp-signup-nudge-copy-v1') return mockCopyVariant ?? fallback;
    return fallback;
  },
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestStats: () => ({ games: 5, words: 100, score: 500 }),
}));

// Mock sessionStorage for happy-dom compatibility
const mockSessionStore: Record<string, string> = {};
vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockSessionStore[key] ?? null);
vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockSessionStore[key] = value; });
vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => { for (const key in mockSessionStore) delete mockSessionStore[key]; });

import { useMultiplayerSignupNudge } from '../useMultiplayerSignupNudge';
import {
  RESULTS_INLINE_SHOWN_KEY,
  markResultsInlineShown,
} from '@/lib/auth/signupPromptCoordination';

describe('useMultiplayerSignupNudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsOnCrazyGamesPlatform = false;
    mockFlagValue = 'after-2nd-game';
    mockCopyVariant = 'control';
    // Clear mock storage
    for (const key in mockSessionStore) delete mockSessionStore[key];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null nudge for authenticated users', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: true, isResultsVisible: true })
    );
    expect(result.current.activeNudge).toBeNull();
  });

  it('returns null nudge on CrazyGames platform', () => {
    mockIsOnCrazyGamesPlatform = true;
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    // Record games to pass threshold
    act(() => { result.current.recordMpGame(); });
    act(() => { result.current.recordMpGame(); });
    act(() => { vi.advanceTimersByTime(3000); });

    expect(result.current.activeNudge).toBeNull();
  });

  it('returns null when results not visible', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: false })
    );
    expect(result.current.activeNudge).toBeNull();
  });

  it('shows sheet after 2 games (default threshold)', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    // Record 2 games
    act(() => { result.current.recordMpGame(); });
    act(() => { result.current.recordMpGame(); });

    // Advance past the 2s delay
    act(() => { vi.advanceTimersByTime(2500); });

    expect(result.current.activeNudge).toBe('sheet');
  });

  it('shows sheet after 3 games when flag is after-3rd-game', () => {
    mockFlagValue = 'after-3rd-game';
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    // Record 2 games — should NOT show
    act(() => { result.current.recordMpGame(); });
    act(() => { result.current.recordMpGame(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.activeNudge).toBeNull();

    // Record 3rd game — should show
    act(() => { result.current.recordMpGame(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.activeNudge).toBe('sheet');
  });

  it('does not re-show the sheet on remount after it was shown once (reload-without-dismiss)', () => {
    // recurring-pitfalls Class 1: the shown-marker must be written at SHOW time,
    // not dismiss time — else a reload (or remount) before the user dismisses
    // re-pops the sheet. PostHog 45d: mp_sheet 168 events / 106 users (~1.6x).
    const first = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );
    act(() => { first.result.current.recordMpGame(); });
    act(() => { first.result.current.recordMpGame(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(first.result.current.activeNudge).toBe('sheet');
    // User does NOT dismiss — they reload / navigate (component remounts).
    first.unmount();

    mockTrackGrowthEvent.mockClear();
    const second = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );
    act(() => { vi.advanceTimersByTime(2500); });

    expect(second.result.current.activeNudge).toBeNull();
    const sheetEmits = mockTrackGrowthEvent.mock.calls.filter(
      ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_sheet',
    );
    expect(sheetEmits).toHaveLength(0);
  });

  it('dismissNudge sets activeNudge to null', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    // Reach sheet threshold
    act(() => { result.current.recordMpGame(); });
    act(() => { result.current.recordMpGame(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.activeNudge).toBe('sheet');

    // Dismiss
    act(() => { result.current.dismissNudge(); });
    expect(result.current.activeNudge).toBeNull();
  });

  describe('t_da22db9a — funnel integrity', () => {
    it('logs a sheet DISMISS as signup_dismissed — never a second prompt_shown', () => {
      // PostHog 14d: 83 `mp_sheet_dismissed` events (77 users) were emitted as
      // `signup_prompt_shown`, polluting the funnel denominator with
      // impressions that can never convert (measured 0.72% prompt→completed).
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(result.current.activeNudge).toBe('sheet');
      mockTrackGrowthEvent.mockClear();

      act(() => { result.current.dismissNudge(); });

      expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
        'signup_dismissed',
        expect.objectContaining({ trigger: 'mp_sheet' })
      );
      const shownAfterDismiss = mockTrackGrowthEvent.mock.calls.filter(
        ([name]) => name === 'signup_prompt_shown'
      );
      expect(shownAfterDismiss).toHaveLength(0);
    });

    it('sheet impression latches the pending key so an MP-driven signup attributes as multi_game_prompt', () => {
      // Previously the MP hook emitted a raw signup_prompt_shown without the
      // sessionStorage latch — a signup started from this sheet could never
      // resolve into the strict prompt→completed funnel.
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });

      expect(window.sessionStorage.getItem(PENDING_KEY)).toBe('multi_game');
    });

    it('dismiss clears the pending completion latch (later header signup attributes as header_or_menu)', () => {
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(window.sessionStorage.getItem(PENDING_KEY)).toBe('multi_game');

      act(() => { result.current.dismissNudge(); });
      expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    });

    it('parallel mounts fire only ONE mp_sheet prompt_shown (in-timer latch re-check)', () => {
      // PostHog 14d: 3 prompt_shown within 1s from a single device — parallel
      // results-view mounts each scheduled a timer before any latched.
      const first = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );
      act(() => { first.result.current.recordMpGame(); });
      act(() => { first.result.current.recordMpGame(); });

      // Second mount sees the same shared session counter and ALSO schedules.
      const second = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { vi.advanceTimersByTime(2500); });

      const sheetEmits = mockTrackGrowthEvent.mock.calls.filter(
        ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_sheet',
      );
      expect(sheetEmits).toHaveLength(1);
      void second;
    });
  });

  it('tracks a dedicated mp_session_game event on recordMpGame (NOT game_completed)', () => {
    // The nudge counts MP games per session for its signup threshold. It must
    // emit its OWN event name — emitting `game_completed` (a reserved lifecycle
    // event) here forged a phantom solo 0-word/0-score row in the admin game
    // log for every MP game, because this emit carries no score/wordCount and
    // no isMultiplayer flag. The real MP completion is emitted by PlayerView.
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    act(() => { result.current.recordMpGame(); });

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'mp_session_game',
      expect.objectContaining({ isGuest: true })
    );
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'game_completed',
      expect.anything()
    );
  });

  it('propagates MP submode (word-hunt/classic/wheel-rush) into mp_session_game `mode`', () => {
    // PostHog submode funnels still need the submode on the nudge event; only
    // the event NAME changed (game_completed → mp_session_game).
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    act(() => { result.current.recordMpGame('word-hunt'); });

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'mp_session_game',
      expect.objectContaining({ mode: 'word-hunt', gameMode: 'word-hunt' })
    );
  });

  it('falls back to mode=multiplayer when no submode supplied (back-compat)', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    act(() => { result.current.recordMpGame(); });

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'mp_session_game',
      expect.objectContaining({ mode: 'multiplayer', gameMode: 'multiplayer' })
    );
  });

  it('recordMpGame increments session counter', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    expect(result.current.stats.mpGamesThisSession).toBe(0);
    act(() => { result.current.recordMpGame(); });
    expect(result.current.stats.mpGamesThisSession).toBe(1);
  });

  it('shouldPulseCoins is false initially', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    // 0 games < 5 threshold
    expect(result.current.shouldPulseCoins).toBe(false);
  });

  it('shouldPulseCoins is false for authenticated users', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: true, isResultsVisible: true })
    );

    expect(result.current.shouldPulseCoins).toBe(false);
  });

  it('stats include total words and score from guestManager', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    expect(result.current.stats.totalWords).toBe(100);
    expect(result.current.stats.totalScore).toBe(500);
  });

  describe('mp-signup-nudge-copy-v1 — toast gating', () => {
    // 28d PostHog: mp_toast trigger fired 58 times, converted 0. Killing it
    // via experiment flag is the cheapest A/B win — variant `toast-disabled`
    // skips the post-sheet toast entirely so guests aren't trained to dismiss
    // a CTA that never converts.

    it('shows toast at game 3 under control variant', () => {
      mockCopyVariant = 'control';
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Reach + dismiss sheet at game 2
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(result.current.activeNudge).toBe('sheet');
      act(() => { result.current.dismissNudge(); });

      // Game 3 → toast appears
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBe('toast');
    });

    it('shows the toast only ONCE per session — never re-fires on later games', () => {
      // PostHog 45d: mp_toast fired ~5.8x/user (one user 22x in a day) because the
      // toast had no shown-marker (unlike the sheet) and the effect re-ran on every
      // new game >= threshold. A once-per-session signup toast must not re-nag.
      mockCopyVariant = 'control';
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Reach + dismiss sheet at game 2
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      act(() => { result.current.dismissNudge(); });

      // Game 3 → toast fires once
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBe('toast');

      mockTrackGrowthEvent.mockClear();

      // Games 4 and 5 → toast must NOT re-fire
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });

      const toastEmits = mockTrackGrowthEvent.mock.calls.filter(
        ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_toast',
      );
      expect(toastEmits).toHaveLength(0);
    });

    it('defaults toast OFF when the flag is unresolved/unenrolled (fallback = toast-disabled)', () => {
      // The toast converted 0/58 (28d). The hook's fallback default is now
      // toast-disabled, so the pre-traction majority (no flag served) never gets
      // the dead nag. Enrolled A/B users still get their served variant.
      mockCopyVariant = null; // no variant served → hook uses its own fallback
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Reach + dismiss the sheet (sheet is independent of the toast flag)
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(result.current.activeNudge).toBe('sheet');
      act(() => { result.current.dismissNudge(); });

      // Game 3+: toast must NOT appear under the default
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBeNull();
    });

    it('suppresses toast under toast-disabled variant', () => {
      mockCopyVariant = 'toast-disabled';
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Sheet still fires (we want to keep collecting some signal)
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(result.current.activeNudge).toBe('sheet');
      act(() => { result.current.dismissNudge(); });

      // Game 3 onwards: toast NEVER appears under toast-disabled
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBeNull();

      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBeNull();
    });

    it('does not emit signup_prompt_shown for mp_toast under toast-disabled', () => {
      mockCopyVariant = 'toast-disabled';
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      act(() => { result.current.dismissNudge(); });
      mockTrackGrowthEvent.mockClear();
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });

      const promptCalls = mockTrackGrowthEvent.mock.calls.filter(
        ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_toast',
      );
      expect(promptCalls).toHaveLength(0);
    });

    it('t_c75cbe59: toast never emits signup_prompt_shown nor latches the pending funnel key — it has no auth CTA', () => {
      // SignupToast.tsx renders a message-only nag (auto-dismiss, no buttons).
      // 6/6.5d post-merge mp_toast impressions were 21% of the host-filtered
      // funnel denominator and could not convert by construction; latching the
      // pending key here also mis-attributed later header signups as
      // multi_game_prompt. The toast stays a nag, outside the signup funnel.
      mockCopyVariant = 'control';
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Reach + dismiss the sheet at game 2
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });
      expect(result.current.activeNudge).toBe('sheet');
      act(() => { result.current.dismissNudge(); });

      // Game 3 → toast appears as a nag, but emits NO funnel step
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBe('toast');

      const toastEmits = mockTrackGrowthEvent.mock.calls.filter(
        ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_toast',
      );
      expect(toastEmits).toHaveLength(0);
      // The completion-attribution latch must stay unarmed: a later header
      // signup by this guest is genuinely header_or_menu, not multi_game_prompt.
      expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    });
  });

  describe('t_ac5ac2f7 — sheet tier suppressed once results_inline has asked this session', () => {
    const sheetShownCalls = () =>
      mockTrackGrowthEvent.mock.calls.filter(
        ([name, props]) => name === 'signup_prompt_shown' && (props as { trigger?: string })?.trigger === 'mp_sheet',
      );

    it('does NOT show the sheet at threshold when results_inline was already shown this session', () => {
      // UR 2026-10-30: 58/60 mp_sheet guests had also seen results_inline; the
      // stacked second ask earned 1 click and 0 signups in 14d. The inline
      // card (rendered on the same results screen) is the one ask.
      markResultsInlineShown();
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });

      expect(result.current.activeNudge).toBeNull();
      expect(sheetShownCalls()).toHaveLength(0);
    });

    it('consumes the sheet tier silently: a later game does NOT re-schedule the sheet', () => {
      mockCopyVariant = 'toast-disabled'; // isolate the sheet tier from the toast
      markResultsInlineShown();
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });
      // Games 3, 4: still no sheet, still no event.
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });

      expect(result.current.activeNudge).toBeNull();
      expect(sheetShownCalls()).toHaveLength(0);
      expect(window.sessionStorage.getItem('boggle_mp_nudge_sheet_shown')).toBe('true');
    });

    it('in-timer re-check: a latch set AFTER scheduling but BEFORE the 2s fire still suppresses the sheet', () => {
      // The inline card on this same results screen can mark the latch while
      // the sheet timer is pending (parallel-mount ordering).
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      // Card shows + marks the latch during the 2s sheet delay.
      act(() => { markResultsInlineShown(); });
      act(() => { vi.advanceTimersByTime(3000); });

      expect(result.current.activeNudge).toBeNull();
      expect(sheetShownCalls()).toHaveLength(0);
    });

    it('toast tier unchanged: still fires at game 3 (control variant) after the sheet was suppressed', () => {
      mockCopyVariant = 'control';
      markResultsInlineShown();
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      // Sheet threshold reached but suppressed (silently marked shown).
      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(result.current.activeNudge).toBeNull();

      // Game 3 → toast tier behaves exactly as if the sheet had shown.
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.activeNudge).toBe('toast');
    });

    it('pulse tier unchanged: shouldPulseCoins still keys off game count only', () => {
      mockCopyVariant = 'toast-disabled'; // isolate: pulse + suppressed sheet only
      markResultsInlineShown();
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      for (let i = 0; i < 5; i++) act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(3000); });

      expect(result.current.shouldPulseCoins).toBe(true);
      expect(result.current.activeNudge).toBeNull(); // sheet still suppressed
    });

    it('sheet STILL fires at threshold when results_inline was never shown (e.g. daily-capped guest)', () => {
      // t_561836a1 caps results_inline at 3/day: a capped-out guest has no
      // inline ask on screen, so the sheet remains the fallback ask.
      expect(window.sessionStorage.getItem(RESULTS_INLINE_SHOWN_KEY)).toBeNull();
      const { result } = renderHook(() =>
        useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
      );

      act(() => { result.current.recordMpGame(); });
      act(() => { result.current.recordMpGame(); });
      act(() => { vi.advanceTimersByTime(2500); });

      expect(result.current.activeNudge).toBe('sheet');
      expect(sheetShownCalls()).toHaveLength(1);
    });
  });
});

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
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
  }),
}));

let mockFlagValue = 'after-2nd-game';
let mockCopyVariant = 'control';
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (key: string, fallback?: unknown) => {
    if (key === 'mp-signup-nudge-threshold') return mockFlagValue;
    if (key === 'mp-signup-nudge-copy-v1') return mockCopyVariant;
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
  });
});

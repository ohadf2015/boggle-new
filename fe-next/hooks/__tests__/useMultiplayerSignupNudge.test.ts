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
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: () => mockFlagValue,
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

  it('tracks PostHog game_completed event on recordMpGame', () => {
    const { result } = renderHook(() =>
      useMultiplayerSignupNudge({ isAuthenticated: false, isResultsVisible: true })
    );

    act(() => { result.current.recordMpGame(); });

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'game_completed',
      expect.objectContaining({ isGuest: true })
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
});

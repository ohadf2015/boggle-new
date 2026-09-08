/**
 * A finished multiplayer round must not be logged as `game_abandoned`.
 *
 * `handleShowResults` is the one chokepoint both HostView and PlayerView call
 * immediately before `setShowResults(true)` unmounts them. Everything that used
 * to clear the active-game flag runs too late to matter:
 *
 *   - `trackGameEnd` -> `markGameInactive` is driven by `useGameEndTelemetry`,
 *     which watches `tournament.finalScores` / `waitingForResults`. Those are set
 *     in the SAME handler as `onShowResults` (`useHostGameEvents.ts:516-537`), so
 *     React batches both into one commit and the host tree is swapped out before
 *     the effect ever observes the rising edge.
 *   - `ResultsMainContent`'s mount emits `results_viewed`, which clears the flag
 *     (`growthTracking.ts:503`) — but `ResultsPage` is a `next/dynamic({ssr:false})`
 *     chunk, so on a cold chunk its mount loses the race against
 *     `emitAbandonOnSpaNavigate`'s `setTimeout(0)`.
 *
 * Production, 90d, after the 2026-08-15 fix: 211 of classic's 512 abandons still
 * fired at 85-95s against a ~90s round. Clearing the flag here removes the
 * dependency on both of those paths.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMultiplayerGameFlow } from '../useMultiplayerGameFlow';
import {
  markGameActive,
  isGameActive,
  __resetAbandonStateForTests,
} from '@/utils/abandonOnPagehide';

vi.mock('@/utils/multiplayerProgressStorage', () => ({
  recordGameCompleted: vi.fn(),
}));

const options = {
  socketRef: { current: null },
  gameCode: 'ABC123',
  isAuthenticated: false,
};

describe('useMultiplayerGameFlow — abandon flag', () => {
  beforeEach(() => {
    __resetAbandonStateForTests();
  });

  it('clears the active-game flag when results are shown', () => {
    // Given a round in progress
    markGameActive('classic');
    expect(isGameActive()).toBe(true);

    const { result } = renderHook(() => useMultiplayerGameFlow(options));

    // When the results screen is triggered
    act(() => {
      result.current.handleShowResults({ scores: [], letterGrid: [] });
    });

    // Then the round is no longer active, so an unmount cannot log an abandon
    expect(isGameActive()).toBe(false);
  });

  it('clears the flag before the results state flips, not after', () => {
    // The unmount that races the abandon timer is triggered BY showResults
    // flipping. If the flag were cleared in a later effect, the cleanup would
    // still see an active game. Assert ordering, not just the end state.
    markGameActive('word-hunt');

    let activeWhenResultsFlipped: boolean | null = null;
    const { result } = renderHook(() => {
      const flow = useMultiplayerGameFlow(options);
      if (flow.showResults && activeWhenResultsFlipped === null) {
        activeWhenResultsFlipped = isGameActive();
      }
      return flow;
    });

    act(() => {
      result.current.handleShowResults({ scores: [], letterGrid: [] });
    });

    expect(activeWhenResultsFlipped).toBe(false);
  });

  it('leaves a genuine mid-round exit alone', () => {
    // No results event -> the flag must stay set so a real abandon still emits.
    markGameActive('blast');
    renderHook(() => useMultiplayerGameFlow(options));
    expect(isGameActive()).toBe(true);
  });
});

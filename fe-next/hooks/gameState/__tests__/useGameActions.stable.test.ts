/**
 * Test: useGameActions returns stable reference across re-renders
 *
 * Bug: React Error #185 (Maximum update depth exceeded)
 *
 * Root cause: useGameActions() without `shallow` equality creates a new object
 * reference on every render, causing useEffect dependencies to re-trigger.
 *
 * Fix: Added `shallow` comparison to useGameActions selector
 */
import { renderHook } from '@testing-library/react';
import { useGameActions, useGameStore } from '../store';

describe('useGameActions stability', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().resetAll();
  });

  it('should return stable reference across re-renders', () => {
    // First render
    const { result, rerender } = renderHook(() => useGameActions());
    const firstResult = result.current;

    // Trigger re-render
    rerender();
    const secondResult = result.current;

    // The object reference should be the same (shallow equality)
    expect(secondResult).toBe(firstResult);
  });

  it('should return stable reference after state changes', () => {
    const { result, rerender } = renderHook(() => useGameActions());
    const firstResult = result.current;

    // Change some state (this triggers store update)
    result.current.setGameActive(true);

    // Re-render
    rerender();
    const afterStateChangeResult = result.current;

    // Actions should still be the same reference
    expect(afterStateChangeResult).toBe(firstResult);
  });

  it('should have all action functions defined', () => {
    const { result } = renderHook(() => useGameActions());

    // Verify all expected actions exist
    const expectedActions = [
      'setGameActive',
      'setLetterGrid',
      'setRemainingTime',
      'setGameLanguage',
      'setMinWordLength',
      'setTotalBoardWords',
      'setPlayers',
      'updatePlayer',
      'addPlayer',
      'removePlayer',
      'setLeaderboard',
      'addFoundWord',
      'setFoundWords',
      'addAchievement',
      'setAchievements',
      'setWaitingForResults',
      'setShowStartAnimation',
      'setShufflingGrid',
      'setHighlightedCells',
      'incrementCombo',
      'resetCombo',
      'updateLastWordTime',
      'setTournamentData',
      'setTournamentStandings',
      'setShowTournamentStandings',
      'setXpGainedData',
      'setLevelUpData',
      'setBoardTheme',
      'setGameMode',
      'resetForNewRound',
      'resetAll',
    ];

    expectedActions.forEach((action) => {
      expect(typeof result.current[action as keyof typeof result.current]).toBe('function');
    });
  });

  it('should not cause infinite re-renders when used in useEffect dependency', () => {
    let renderCount = 0;
    const MAX_RENDERS = 10;

    const { result } = renderHook(() => {
      renderCount++;

      // This would cause infinite loop without shallow equality
      const actions = useGameActions();

      // Simulate what usePlayerGameEvents does - use actions in effect
      // If actions reference changes each render, this would cause infinite loop
      if (renderCount === 1) {
        // On first render, trigger a state change
        actions.setFoundWords([]);
      }

      return actions;
    });

    // If we get here without hitting maximum renders, the test passes
    // React would throw Error #185 if there was an infinite loop
    expect(renderCount).toBeLessThanOrEqual(MAX_RENDERS);
    expect(result.current).toBeDefined();
  });
});

/**
 * TDD RED: updatePlayer should skip state update when values haven't changed.
 *
 * During multiplayer gameplay, updatePlayer is called ~5x/sec per player
 * (leaderboard refreshes). Creating a new array reference each time
 * triggers unnecessary React re-renders even when nothing changed.
 */

import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../store';

describe('updatePlayer no-op optimization', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useGameStore.getState().resetAll();
    });
  });

  it('should return same state reference when update values are identical', () => {
    const { result } = renderHook(() => useGameStore());

    // GIVEN: a player exists in the store
    act(() => {
      result.current.addPlayer({ username: 'alice', isHost: true });
    });

    const playersBefore = useGameStore.getState().players;

    // WHEN: updatePlayer is called with identical values
    act(() => {
      result.current.updatePlayer('alice', { isHost: true });
    });

    const playersAfter = useGameStore.getState().players;

    // THEN: the players array reference should be the same (no new array created)
    expect(playersAfter).toBe(playersBefore);
  });

  it('should return new state when values actually change', () => {
    const { result } = renderHook(() => useGameStore());

    act(() => {
      result.current.addPlayer({ username: 'bob', isHost: false, presence: 'active' });
    });

    const playersBefore = useGameStore.getState().players;

    // WHEN: updatePlayer is called with different values
    act(() => {
      result.current.updatePlayer('bob', { presence: 'idle' });
    });

    const playersAfter = useGameStore.getState().players;

    // THEN: the players array reference should be different
    expect(playersAfter).not.toBe(playersBefore);
    expect(playersAfter[0].presence).toBe('idle');
  });

  it('should return same state when player not found', () => {
    const { result } = renderHook(() => useGameStore());

    act(() => {
      result.current.addPlayer({ username: 'charlie' });
    });

    const stateBefore = useGameStore.getState();

    act(() => {
      result.current.updatePlayer('nonexistent', { isHost: true });
    });

    const stateAfter = useGameStore.getState();

    // Should return same state object (existing behavior)
    expect(stateAfter.players).toBe(stateBefore.players);
  });

  it('should handle undefined update values correctly', () => {
    const { result } = renderHook(() => useGameStore());

    act(() => {
      result.current.addPlayer({ username: 'dave', disconnected: false });
    });

    const playersBefore = useGameStore.getState().players;

    // WHEN: updating with undefined (no actual change to existing false)
    act(() => {
      result.current.updatePlayer('dave', { disconnected: false });
    });

    const playersAfter = useGameStore.getState().players;

    // THEN: same reference (no change)
    expect(playersAfter).toBe(playersBefore);
  });
});

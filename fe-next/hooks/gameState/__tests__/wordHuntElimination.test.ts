/**
 * Test: wordHuntEliminatedPlayers in Zustand store
 *
 * TDD RED phase — verifies store has eliminated players field + setter
 */

import { renderHook, act } from '@testing-library/react';
import {
  useGameStore,
  useWordHuntEliminatedPlayers,
} from '../store';

describe('wordHuntEliminatedPlayers store field', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.getState().resetAll();
    });
  });

  it('should initialize with empty eliminated players array', () => {
    const { result } = renderHook(() => useWordHuntEliminatedPlayers());
    expect(result.current).toEqual([]);
  });

  it('should set eliminated players via setter', () => {
    act(() => {
      useGameStore.getState().setWordHuntEliminatedPlayers(['alice']);
    });
    const { result } = renderHook(() => useWordHuntEliminatedPlayers());
    expect(result.current).toEqual(['alice']);
  });

  it('should support functional update to add eliminated player', () => {
    act(() => {
      useGameStore.getState().setWordHuntEliminatedPlayers(['alice']);
    });
    act(() => {
      useGameStore.getState().setWordHuntEliminatedPlayers((prev) => [...prev, 'bob']);
    });
    const { result } = renderHook(() => useWordHuntEliminatedPlayers());
    expect(result.current).toEqual(['alice', 'bob']);
  });

  it('should reset eliminated players on resetForNewRound', () => {
    act(() => {
      useGameStore.getState().setWordHuntEliminatedPlayers(['alice', 'bob']);
    });
    act(() => {
      useGameStore.getState().resetForNewRound();
    });
    const { result } = renderHook(() => useWordHuntEliminatedPlayers());
    expect(result.current).toEqual([]);
  });
});

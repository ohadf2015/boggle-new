import { renderHook, act } from '@testing-library/react';
import { useShiritoriGhostMultiplier } from '../useShiritoriGhostMultiplier';

describe('useShiritoriGhostMultiplier', () => {
  it('starts as non-ghost turn (turn 0)', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    expect(result.current.isGhostTurn).toBe(false);
    expect(result.current.multiplier).toBe(1);
  });

  it('fires ghost on 6th player turn (0-indexed turn 5)', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    for (let i = 0; i < 5; i++) {
      act(() => result.current.markTurnPlayed());
    }
    expect(result.current.isGhostTurn).toBe(true);
    expect(result.current.multiplier).toBe(2);
  });

  it('is not a ghost turn at turn 4 (one before trigger)', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    for (let i = 0; i < 4; i++) {
      act(() => result.current.markTurnPlayed());
    }
    expect(result.current.isGhostTurn).toBe(false);
  });

  it('resets cycle after 6th turn is played', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    for (let i = 0; i < 6; i++) {
      act(() => result.current.markTurnPlayed());
    }
    expect(result.current.isGhostTurn).toBe(false);
    expect(result.current.multiplier).toBe(1);
  });

  it('fires again on 12th turn (0-indexed turn 11)', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    for (let i = 0; i < 11; i++) {
      act(() => result.current.markTurnPlayed());
    }
    expect(result.current.isGhostTurn).toBe(true);
  });

  it('reset() restores to turn 0 (no ghost)', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    for (let i = 0; i < 5; i++) {
      act(() => result.current.markTurnPlayed());
    }
    expect(result.current.isGhostTurn).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isGhostTurn).toBe(false);
    expect(result.current.playerTurnCount).toBe(0);
  });

  it('playerTurnCount increments with each markTurnPlayed call', () => {
    const { result } = renderHook(() => useShiritoriGhostMultiplier());
    act(() => result.current.markTurnPlayed());
    act(() => result.current.markTurnPlayed());
    expect(result.current.playerTurnCount).toBe(2);
  });
});

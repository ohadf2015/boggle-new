import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMultiplayerGameFlow } from '../useMultiplayerGameFlow';

vi.mock('@/utils/multiplayerProgressStorage', () => ({ recordGameCompleted: vi.fn() }));

const options = { socketRef: { current: null }, gameCode: 'ABC123', isAuthenticated: false };
const start = { letterGrid: [['A']], timerSeconds: 60, language: 'en' as const };
const results = { scores: [], letterGrid: [['A']] };

describe('useMultiplayerGameFlow game duration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('given the pending start was consumed by the game view, when results arrive, then duration uses the round timer', () => {
    const { result } = renderHook(() => useMultiplayerGameFlow(options));
    act(() => {
      result.current.setPendingGameStart(start);
      result.current.setGameStartTime(Date.now());
    });
    act(() => result.current.setPendingGameStart(null));

    vi.setSystemTime(new Date('2026-10-30T10:01:30Z'));
    act(() => result.current.handleShowResults(results));

    expect(result.current.gameDuration).toBe(60);
  });

  it('given results arrive before the timer ends, then duration is the elapsed time', () => {
    const { result } = renderHook(() => useMultiplayerGameFlow(options));
    act(() => {
      result.current.setPendingGameStart(start);
      result.current.setGameStartTime(Date.now());
    });
    act(() => result.current.setPendingGameStart(null));

    vi.setSystemTime(new Date('2026-10-30T10:00:42Z'));
    act(() => result.current.handleShowResults(results));

    expect(result.current.gameDuration).toBe(42);
  });
});

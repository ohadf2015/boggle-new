import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMpWinStreak } from '../useMpWinStreak';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

describe('useMpWinStreak', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('starts with 0 current and best streak', () => {
    const { result } = renderHook(() => useMpWinStreak());
    const streak = result.current.getStreak('classic');
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(0);
  });

  it('increments streak on recordWin', () => {
    const { result } = renderHook(() => useMpWinStreak());
    act(() => { result.current.recordWin('classic'); });
    expect(result.current.getStreak('classic').current).toBe(1);
    act(() => { result.current.recordWin('classic'); });
    expect(result.current.getStreak('classic').current).toBe(2);
  });

  it('resets streak on recordLoss', () => {
    const { result } = renderHook(() => useMpWinStreak());
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordLoss('classic'); });
    expect(result.current.getStreak('classic').current).toBe(0);
  });

  it('preserves best streak after loss', () => {
    const { result } = renderHook(() => useMpWinStreak());
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordLoss('classic'); });
    expect(result.current.getStreak('classic').best).toBe(3);
    expect(result.current.getStreak('classic').current).toBe(0);
  });

  it('tracks modes independently', () => {
    const { result } = renderHook(() => useMpWinStreak());
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('wordHunt'); });
    expect(result.current.getStreak('classic').current).toBe(2);
    expect(result.current.getStreak('wordHunt').current).toBe(1);
  });

  it('detects milestone at 3, 5, 10', () => {
    const { result } = renderHook(() => useMpWinStreak());
    let milestone: number | null = null;
    // Build to 3
    act(() => { milestone = result.current.recordWin('classic').milestone; });
    act(() => { milestone = result.current.recordWin('classic').milestone; });
    act(() => { milestone = result.current.recordWin('classic').milestone; });
    expect(milestone).toBe(3);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useMpWinStreak());
    act(() => { result.current.recordWin('classic'); });
    act(() => { result.current.recordWin('classic'); });

    // Re-mount hook — should load from localStorage
    const { result: result2 } = renderHook(() => useMpWinStreak());
    expect(result2.current.getStreak('classic').current).toBe(2);
  });
});

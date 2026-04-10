import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFirstTimeEncouragement } from '../useFirstTimeEncouragement';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useFirstTimeEncouragement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('identifies first-time player when games_played < 3', () => {
    localStorageMock.getItem.mockReturnValue('1');
    const { result } = renderHook(() => useFirstTimeEncouragement());
    expect(result.current.isFirstTimePlayer).toBe(true);
  });

  it('identifies returning player when games_played >= 3', () => {
    localStorageMock.getItem.mockReturnValue('5');
    const { result } = renderHook(() => useFirstTimeEncouragement());
    expect(result.current.isFirstTimePlayer).toBe(false);
  });

  it('shows encouragement for first-time player', () => {
    localStorageMock.getItem.mockReturnValue('0');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    expect(result.current.currentTrigger).toBe('game-start');
  });

  it('does not show encouragement for returning player', () => {
    localStorageMock.getItem.mockReturnValue('10');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    expect(result.current.currentTrigger).toBeNull();
  });

  it('auto-dismisses after 2.5 seconds', () => {
    localStorageMock.getItem.mockReturnValue('0');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    expect(result.current.currentTrigger).toBe('game-start');

    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.currentTrigger).toBeNull();
  });

  it('rate-limits to 1 message per 15 seconds', () => {
    localStorageMock.getItem.mockReturnValue('0');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    expect(result.current.currentTrigger).toBe('game-start');

    // Try to trigger another immediately — should be rate-limited
    act(() => { result.current.triggerEncouragement('first-word'); });
    expect(result.current.currentTrigger).toBe('game-start');
  });

  it('allows new message after rate limit expires', () => {
    localStorageMock.getItem.mockReturnValue('0');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    act(() => { vi.advanceTimersByTime(15001); });

    act(() => { result.current.triggerEncouragement('first-word'); });
    expect(result.current.currentTrigger).toBe('first-word');
  });

  it('dismiss clears the current trigger', () => {
    localStorageMock.getItem.mockReturnValue('0');
    const { result } = renderHook(() => useFirstTimeEncouragement());

    act(() => { result.current.triggerEncouragement('game-start'); });
    act(() => { result.current.dismiss(); });
    expect(result.current.currentTrigger).toBeNull();
  });
});

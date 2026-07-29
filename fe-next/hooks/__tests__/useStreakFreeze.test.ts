/**
 * useStreakFreeze Hook Tests
 * TDD: RED phase first
 */
import { renderHook, act } from '@testing-library/react';
import { useStreakFreeze } from '../useStreakFreeze';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('useStreakFreeze', () => {
  test('initial freeze count is 0', () => {
    const { result } = renderHook(() => useStreakFreeze());
    expect(result.current.freezeCount).toBe(0);
  });

  test('earnFreeze increments count', () => {
    const { result } = renderHook(() => useStreakFreeze());
    act(() => { result.current.earnFreeze(); });
    expect(result.current.freezeCount).toBe(1);
  });

  test('freeze count caps at 3', () => {
    const { result } = renderHook(() => useStreakFreeze());
    act(() => { result.current.earnFreeze(); });
    act(() => { result.current.earnFreeze(); });
    act(() => { result.current.earnFreeze(); });
    act(() => { result.current.earnFreeze(); }); // 4th should not exceed 3
    expect(result.current.freezeCount).toBe(3);
  });

  test('consumeFreeze decrements count', () => {
    const { result } = renderHook(() => useStreakFreeze());
    act(() => { result.current.earnFreeze(); });
    act(() => { result.current.earnFreeze(); });
    const consumed = act(() => result.current.consumeFreeze());
    expect(result.current.freezeCount).toBe(1);
  });

  test('consumeFreeze returns false when count is 0', () => {
    const { result } = renderHook(() => useStreakFreeze());
    let consumed: boolean = false;
    act(() => { consumed = result.current.consumeFreeze(); });
    expect(consumed).toBe(false);
    expect(result.current.freezeCount).toBe(0);
  });

  test('consumeFreeze returns true when freeze available', () => {
    const { result } = renderHook(() => useStreakFreeze());
    act(() => { result.current.earnFreeze(); });
    let consumed: boolean = false;
    act(() => { consumed = result.current.consumeFreeze(); });
    expect(consumed).toBe(true);
    expect(result.current.freezeCount).toBe(0);
  });

  test('persists to localStorage', () => {
    const { result } = renderHook(() => useStreakFreeze());
    act(() => { result.current.earnFreeze(); });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'lexiclash_streak_freezes',
      expect.any(String)
    );
  });

  test('loads from localStorage on init', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ count: 2 }));
    const { result } = renderHook(() => useStreakFreeze());
    expect(result.current.freezeCount).toBe(2);
  });
});

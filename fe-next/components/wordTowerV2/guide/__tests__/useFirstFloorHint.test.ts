import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { FIRST_FLOOR_HINT_MS, useFirstFloorHint } from '../useFirstFloorHint';

afterEach(() => vi.useRealTimers());

const dict = new Set(['CAT', 'ACT']);
const base = {
  dict,
  dictReady: true,
  wheel: ['C', 'A', 'T', 'X'],
  selectedCount: 0,
  phase: 'composing' as const,
  floors: 0,
  towerFloors: 0,
  guideActive: false,
};

describe('useFirstFloorHint', () => {
  it('given half of the empty-tower leaves come within ~20s, when a new player stalls, then the word lights up within 5s', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstFloorHint(base));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).not.toBeNull();
  });

  it('given a new player stuck on the first floor, when the wait passes, then a real word lights up', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstFloorHint(base));
    expect(result.current).toBeNull();
    act(() => vi.advanceTimersByTime(FIRST_FLOOR_HINT_MS + 10));
    expect(result.current).not.toBeNull();
    expect(result.current!.map((i) => base.wheel[i]).join('')).toMatch(/^(CAT|ACT)$/);
  });

  it('given a player already spelling, when the wait passes, then no hint', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstFloorHint({ ...base, selectedCount: 1 }));
    act(() => vi.advanceTimersByTime(FIRST_FLOOR_HINT_MS + 10));
    expect(result.current).toBeNull();
  });

  it('given a tower already standing (a returning player), when the wait passes, then no hint', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstFloorHint({ ...base, towerFloors: 4 }));
    act(() => vi.advanceTimersByTime(FIRST_FLOOR_HINT_MS + 10));
    expect(result.current).toBeNull();
  });

  it('given the guided first word is showing, when the wait passes, then no second hint', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstFloorHint({ ...base, guideActive: true }));
    act(() => vi.advanceTimersByTime(FIRST_FLOOR_HINT_MS + 10));
    expect(result.current).toBeNull();
  });

  it('given a hint, when the first floor lands, then it goes away', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook((p: typeof base) => useFirstFloorHint(p), { initialProps: base });
    act(() => vi.advanceTimersByTime(FIRST_FLOOR_HINT_MS + 10));
    expect(result.current).not.toBeNull();
    rerender({ ...base, floors: 1 });
    expect(result.current).toBeNull();
  });
});

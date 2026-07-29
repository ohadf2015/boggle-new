import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSabotage } from '../useSabotage';

describe('useSabotage', () => {
  beforeEach(() => {
    // Reset localStorage between cases so the breadcrumb log doesn't leak
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts with zero tokens and a closed picker', () => {
    const { result } = renderHook(() => useSabotage(0));
    expect(result.current.tokens).toBe(0);
    expect(result.current.pickerOpen).toBe(false);
  });

  it('awards a token when the perfect streak hits the threshold', () => {
    const { result, rerender } = renderHook(({ s }) => useSabotage(s), { initialProps: { s: 0 } });
    rerender({ s: 3 });
    expect(result.current.tokens).toBe(1);
    expect(result.current.earnedToast).toBe(3);
  });

  it('canSabotageNow requires both a token AND a rival', () => {
    const { result, rerender } = renderHook(({ s }) => useSabotage(s), { initialProps: { s: 0 } });
    expect(result.current.canSabotageNow(2)).toBe(false);
    rerender({ s: 3 });
    expect(result.current.canSabotageNow(2)).toBe(true);
    expect(result.current.canSabotageNow(0)).toBe(false); // no rivals
  });

  it('sabotage spends a token and records a hit', () => {
    const { result, rerender } = renderHook(({ s }) => useSabotage(s), { initialProps: { s: 0 } });
    rerender({ s: 3 });
    act(() => result.current.sabotage('rival-7', 'Alex'));
    expect(result.current.tokens).toBe(0);
    expect(result.current.lastHit?.targetName).toBe('Alex');
    expect(result.current.hitsByRival['rival-7']).toBe(1);
  });

  it('a second sabotage with no tokens is a no-op', () => {
    const { result } = renderHook(() => useSabotage(0));
    act(() => result.current.sabotage('rival-1', 'No-One'));
    expect(result.current.tokens).toBe(0);
    expect(result.current.lastHit).toBeNull();
  });
});

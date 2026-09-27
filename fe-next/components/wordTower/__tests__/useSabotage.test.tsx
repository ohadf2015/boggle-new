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

  it('does NOT award a token from perfect streak alone (progression-only earn)', () => {
    // Perfect-drop streak used to double as an earn path, which made charges
    // regenerate almost every word for a competent player — far more often
    // than the founder's "new zone / achievement" brief intended. Streak is
    // still tracked/displayed elsewhere, but must not grant charges.
    const { result, rerender } = renderHook(({ s }) => useSabotage(s), { initialProps: { s: 0 } });
    rerender({ s: 3 });
    rerender({ s: 9 });
    expect(result.current.tokens).toBe(0);
    expect(result.current.earnedToast).toBeNull();
  });

  it('canSabotageNow requires both a token AND a rival', () => {
    const { result, rerender } = renderHook(({ s, e }) => useSabotage(s, e), { initialProps: { s: 0, e: 0 } });
    expect(result.current.canSabotageNow(2)).toBe(false);
    rerender({ s: 0, e: 1 });
    expect(result.current.canSabotageNow(2)).toBe(true);
    expect(result.current.canSabotageNow(0)).toBe(false); // no rivals
  });

  it('sabotage spends a token and records a hit', () => {
    const { result, rerender } = renderHook(({ e }) => useSabotage(0, e), { initialProps: { e: 0 } });
    rerender({ e: 1 });
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

  it('earns a charge from progression events (new zone / achievement)', () => {
    const { result, rerender } = renderHook(({ e }) => useSabotage(0, e), {
      initialProps: { e: 0 },
    });
    expect(result.current.tokens).toBe(0);
    rerender({ e: 1 }); // entered a new zone
    expect(result.current.tokens).toBe(1);
    rerender({ e: 2 }); // unlocked an achievement
    expect(result.current.tokens).toBe(2);
  });

  it('does not phantom-re-grant a progression charge after it is spent', () => {
    const { result, rerender } = renderHook(({ e }) => useSabotage(0, e), {
      initialProps: { e: 0 },
    });
    rerender({ e: 1 });
    act(() => result.current.sabotage('rival-2', 'Sam'));
    expect(result.current.tokens).toBe(0);
    // Re-render with the SAME earn total — must not re-grant the spent charge.
    rerender({ e: 1 });
    expect(result.current.tokens).toBe(0);
  });
});

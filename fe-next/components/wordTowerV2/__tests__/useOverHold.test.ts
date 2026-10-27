import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOverHold } from '../useOverHold';
import type { Phase } from '../useTowerRun';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const hold = (phase: Phase, daily: boolean) =>
  renderHook(({ p, d }) => useOverHold(p, d), { initialProps: { p: phase, d: daily } });

describe('useOverHold', () => {
  it('given an endless run that ends, when 1300ms pass, then the results show (unchanged beat)', () => {
    const { result, rerender } = hold('composing', false);
    rerender({ p: 'over', d: false });
    act(() => vi.advanceTimersByTime(1200));
    expect(result.current.showOver).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.showOver).toBe(true);
  });

  it('given an endless run, when the player taps during the collapse, then nothing is skipped', () => {
    const { result, rerender } = hold('composing', false);
    rerender({ p: 'over', d: false });
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.showOver).toBe(false);
  });

  it('given a daily run that ends, then the collapse beat is under a second', () => {
    const { result, rerender } = hold('composing', true);
    rerender({ p: 'over', d: true });
    act(() => vi.advanceTimersByTime(950));
    expect(result.current.showOver).toBe(true);
  });

  it('given a daily run collapsing, when the player taps, then the results show at once', () => {
    const { result, rerender } = hold('composing', true);
    rerender({ p: 'over', d: true });
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.showOver).toBe(true);
  });

  it('given the results showed once, when they are closed and reopened, then they do not celebrate again', () => {
    const { result, rerender } = hold('composing', true);
    rerender({ p: 'over', d: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.celebrate).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.resultsDismissed).toBe(true);
    act(() => result.current.reopen());
    expect(result.current.resultsDismissed).toBe(false);
    expect(result.current.celebrate).toBe(false);
  });

  it('given a new run starts, then the hold, dismissal and celebration reset', () => {
    const { result, rerender } = hold('composing', true);
    rerender({ p: 'over', d: true });
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.dismiss());
    rerender({ p: 'composing', d: true });
    expect(result.current.showOver).toBe(false);
    expect(result.current.resultsDismissed).toBe(false);
    expect(result.current.celebrate).toBe(true);
  });
});

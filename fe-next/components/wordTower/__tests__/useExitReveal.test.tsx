import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExitReveal } from '../useExitReveal';

describe('useExitReveal — hold a toast through a cool exit after its source clears', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows the live source immediately, not exiting', () => {
    const { result } = renderHook(({ s }) => useExitReveal(s, 400), { initialProps: { s: 'Nice!' as string | null } });
    expect(result.current.value).toBe('Nice!');
    expect(result.current.exiting).toBe(false);
  });

  it('keeps rendering the LAST message during the exit window after the source nulls', () => {
    const { result, rerender } = renderHook(({ s }) => useExitReveal(s, 400), { initialProps: { s: 'Skyscraper!' as string | null } });
    rerender({ s: null });
    // still on screen, now flagged exiting (so the caller can play the exit anim)
    expect(result.current.value).toBe('Skyscraper!');
    expect(result.current.exiting).toBe(true);
  });

  it('unmounts only after the exit duration elapses', () => {
    const { result, rerender } = renderHook(({ s }) => useExitReveal(s, 400), { initialProps: { s: 'Combo x5' as string | null } });
    rerender({ s: null });
    act(() => { vi.advanceTimersByTime(399); });
    expect(result.current.value).toBe('Combo x5'); // still exiting
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current.value).toBeNull(); // gone
    expect(result.current.exiting).toBe(false);
  });

  it('a NEW message before the exit finishes cancels the exit and shows the new one', () => {
    const { result, rerender } = renderHook(({ s }) => useExitReveal(s, 400), { initialProps: { s: 'Perfect!' as string | null } });
    rerender({ s: null });
    expect(result.current.exiting).toBe(true);
    rerender({ s: 'On Fire!' });
    expect(result.current.value).toBe('On Fire!');
    expect(result.current.exiting).toBe(false);
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.value).toBe('On Fire!'); // the stale exit timer didn't kill it
  });

  it('exitMs=0 unmounts SYNCHRONOUSLY (reduced-motion path) — no timer to starve', () => {
    const { result, rerender } = renderHook(({ s }) => useExitReveal(s, 0), { initialProps: { s: 'Hi' as string | null } });
    rerender({ s: null });
    // Cleared in the effect body, not via a 0ms timer — gone without advancing time.
    expect(result.current.value).toBeNull();
    expect(result.current.exiting).toBe(false);
  });
});

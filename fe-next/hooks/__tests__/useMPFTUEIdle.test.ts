/**
 * Tests for useMPFTUEIdle — MP drag-coachmark idle timer.
 * Shows coachmark when player is idle (no drag, no word) for N ms,
 * dismisses on activity/success, persists 'shown' to localStorage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMPFTUEIdle } from '../useMPFTUEIdle';

const KEY = 'mp_ftue_drag_v1';

describe('useMPFTUEIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('starts hidden', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0 }),
    );
    expect(result.current.visible).toBe(false);
  });

  it('shows after idleMs of no activity', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 1000 }),
    );
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.visible).toBe(true);
  });

  it('does not show before idleMs elapses', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 1000 }),
    );
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current.visible).toBe(false);
  });

  it('does not show when enabled=false', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: false, wordsFound: 0, idleMs: 1000 }),
    );
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.visible).toBe(false);
  });

  it('markActivity resets timer', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 1000 }),
    );
    act(() => { vi.advanceTimersByTime(800); });
    act(() => { result.current.markActivity(); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.visible).toBe(false);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.visible).toBe(true);
  });

  it('markActivity hides if currently visible', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 500 }),
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.visible).toBe(true);
    act(() => { result.current.markActivity(); });
    expect(result.current.visible).toBe(false);
  });

  it('hides when wordsFound increments', () => {
    const { result, rerender } = renderHook(
      ({ wf }) => useMPFTUEIdle({ enabled: true, wordsFound: wf, idleMs: 500 }),
      { initialProps: { wf: 0 } },
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.visible).toBe(true);
    rerender({ wf: 1 });
    expect(result.current.visible).toBe(false);
  });

  it('does not re-show after wordsFound > 0', () => {
    const { result, rerender } = renderHook(
      ({ wf }) => useMPFTUEIdle({ enabled: true, wordsFound: wf, idleMs: 500 }),
      { initialProps: { wf: 0 } },
    );
    rerender({ wf: 1 });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.visible).toBe(false);
  });

  it('persists dismissal to localStorage after wordsFound > 0', () => {
    const { rerender } = renderHook(
      ({ wf }) => useMPFTUEIdle({ enabled: true, wordsFound: wf, idleMs: 500 }),
      { initialProps: { wf: 0 } },
    );
    rerender({ wf: 1 });
    expect(localStorage.getItem(KEY)).toBe('dismissed');
  });

  it('never shows if localStorage flag is dismissed', () => {
    localStorage.setItem(KEY, 'dismissed');
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 500 }),
    );
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.visible).toBe(false);
  });

  it('explicit dismiss hides and persists', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 500 }),
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.visible).toBe(true);
    act(() => { result.current.dismiss(); });
    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('dismissed');
  });

  it('auto-hides after autoHideMs while showing', () => {
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 500, autoHideMs: 2000 }),
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.visible).toBe(true);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.visible).toBe(false);
  });

  it('emits onShown once when visible flips true', () => {
    const onShown = vi.fn();
    const { result } = renderHook(() =>
      useMPFTUEIdle({ enabled: true, wordsFound: 0, idleMs: 500, onShown }),
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(onShown).toHaveBeenCalledTimes(1);
    act(() => { result.current.markActivity(); });
    act(() => { vi.advanceTimersByTime(500); });
    // should not refire — already shown this session
    expect(onShown).toHaveBeenCalledTimes(1);
  });
});

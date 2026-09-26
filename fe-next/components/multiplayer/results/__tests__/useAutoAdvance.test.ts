import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoAdvance, AUTO_ADVANCE_CANCEL_KEY } from '../useAutoAdvance';

describe('useAutoAdvance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('does not tick until it is armed (the reveal must not eat the countdown)', () => {
    const onFire = vi.fn();
    const { result, rerender } = renderHook((p: { armed: boolean }) => useAutoAdvance({ seconds: 10, armed: p.armed, paused: false, enabled: true, onFire }), { initialProps: { armed: false } });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onFire).not.toHaveBeenCalled();
    expect(result.current.secondsLeft).toBe(10);
    rerender({ armed: true });
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(result.current.secondsLeft).toBe(7);
  });

  it('fires exactly once when it runs out', () => {
    const onFire = vi.fn();
    renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: true, onFire }));
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('holds while paused (details sheet / a modal open) and resumes where it was', () => {
    const onFire = vi.fn();
    const { result, rerender } = renderHook((p: { paused: boolean }) => useAutoAdvance({ seconds: 10, armed: true, paused: p.paused, enabled: true, onFire }), { initialProps: { paused: false } });
    act(() => { vi.advanceTimersByTime(4_000); });
    rerender({ paused: true });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onFire).not.toHaveBeenCalled();
    expect(result.current.secondsLeft).toBe(6);
    rerender({ paused: false });
    act(() => { vi.advanceTimersByTime(6_000); });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('cancel() stops it and remembers the choice for the session', () => {
    const onFire = vi.fn();
    const { result } = renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: true, onFire }));
    act(() => { result.current.cancel(); });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onFire).not.toHaveBeenCalled();
    expect(result.current.active).toBe(false);
    expect(sessionStorage.getItem(AUTO_ADVANCE_CANCEL_KEY)).toBe('1');
  });

  it('starts cancelled when the session flag is set (unless persistence is off, e.g. CrazyGames)', () => {
    sessionStorage.setItem(AUTO_ADVANCE_CANCEL_KEY, '1');
    const onFire = vi.fn();
    const { result } = renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: true, onFire }));
    expect(result.current.active).toBe(false);
    const cg = renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: true, onFire, persistCancel: false }));
    expect(cg.result.current.active).toBe(true);
  });

  it('never runs when disabled (classroom: the teacher paces the room)', () => {
    const onFire = vi.fn();
    const { result } = renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: false, onFire }));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onFire).not.toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });

  it('a manual go clears the cancel flag', () => {
    sessionStorage.setItem(AUTO_ADVANCE_CANCEL_KEY, '1');
    const { result } = renderHook(() => useAutoAdvance({ seconds: 10, armed: true, paused: false, enabled: true, onFire: vi.fn() }));
    act(() => { result.current.clearCancel(); });
    expect(sessionStorage.getItem(AUTO_ADVANCE_CANCEL_KEY)).toBeNull();
  });
});

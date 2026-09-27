import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAvatarMood } from '@/hooks/useAvatarMood';

describe('useAvatarMood', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts idle', () => {
    const { result } = renderHook(() => useAvatarMood());
    expect(result.current.mood).toBe('idle');
  });

  it('trigger sets the mood', () => {
    const { result } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('correct'));
    expect(result.current.mood).toBe('correct');
  });

  it('auto-clears a transient mood back to idle after its duration', () => {
    const { result } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('correct')); // 900ms default
    expect(result.current.mood).toBe('correct');
    act(() => vi.advanceTimersByTime(901));
    expect(result.current.mood).toBe('idle');
  });

  it('persists a state mood (afk) with no auto-clear', () => {
    const { result } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('afk'));
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.mood).toBe('afk');
  });

  it('honours an explicit duration override', () => {
    const { result } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('streak', 300));
    act(() => vi.advanceTimersByTime(299));
    expect(result.current.mood).toBe('streak');
    act(() => vi.advanceTimersByTime(2));
    expect(result.current.mood).toBe('idle');
  });

  it('a new trigger cancels the previous auto-clear timer', () => {
    const { result } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('correct')); // would clear at 900
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.trigger('wrong')); // restarts at 700
    act(() => vi.advanceTimersByTime(500)); // 500 < 700 → still wrong, old timer must not fire
    expect(result.current.mood).toBe('wrong');
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.mood).toBe('idle');
  });

  it('clears its timer on unmount (no setState after unmount)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useAvatarMood());
    act(() => result.current.trigger('correct'));
    unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReactiveAvatarMood } from '@/hooks/useReactiveAvatarMood';

describe('useReactiveAvatarMood', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is idle on mount (no prior event)', () => {
    const { result } = renderHook(() =>
      useReactiveAvatarMood({ score: 0, rank: 0, scoreChange: 0, rankChange: 0, comboLevel: 0 }),
    );
    expect(result.current).toBe('idle');
  });

  it('fires "correct" on an ordinary score gain', () => {
    const { result, rerender } = renderHook((props) => useReactiveAvatarMood(props), {
      initialProps: { score: 0, rank: 0, scoreChange: 0, rankChange: 0, comboLevel: 0 },
    });
    act(() => {
      rerender({ score: 10, rank: 0, scoreChange: 10, rankChange: 0, comboLevel: 0 });
    });
    expect(result.current).toBe('correct');
  });

  it('fires "emoteShock" when overtaken', () => {
    const { result, rerender } = renderHook((props) => useReactiveAvatarMood(props), {
      initialProps: { score: 50, rank: 0, scoreChange: 0, rankChange: 0, comboLevel: 0 },
    });
    act(() => {
      rerender({ score: 50, rank: 1, scoreChange: 0, rankChange: -1, comboLevel: 0 });
    });
    expect(result.current).toBe('emoteShock');
  });

  it('auto-clears back to idle after the mood lifetime', () => {
    const { result, rerender } = renderHook((props) => useReactiveAvatarMood(props), {
      initialProps: { score: 0, rank: 0, scoreChange: 0, rankChange: 0, comboLevel: 0 },
    });
    act(() => {
      rerender({ score: 10, rank: 0, scoreChange: 10, rankChange: 0, comboLevel: 0 });
    });
    expect(result.current).toBe('correct');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe('idle');
  });

  // THE discriminating test: a delta-keyed effect would skip the second equal
  // delta (Object.is-equal deps) and the avatar would silently drop the reaction.
  // Keying on absolute score makes it fire every real scoring event.
  it('fires AGAIN on a second equal delta with advancing absolute score', () => {
    const { result, rerender } = renderHook((props) => useReactiveAvatarMood(props), {
      initialProps: { score: 0, rank: 0, scoreChange: 0, rankChange: 0, comboLevel: 0 },
    });

    // First word: 0 -> 10, delta 10
    act(() => {
      rerender({ score: 10, rank: 0, scoreChange: 10, rankChange: 0, comboLevel: 0 });
    });
    expect(result.current).toBe('correct');

    // Let it settle back to idle.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe('idle');

    // Second word, SAME delta: 10 -> 20, delta still 10. Must react again.
    act(() => {
      rerender({ score: 20, rank: 0, scoreChange: 10, rankChange: 0, comboLevel: 0 });
    });
    expect(result.current).toBe('correct');
  });

  it('does not fire on a no-op re-render (same score/rank, zero deltas)', () => {
    const { result, rerender } = renderHook((props) => useReactiveAvatarMood(props), {
      initialProps: { score: 30, rank: 1, scoreChange: 0, rankChange: 0, comboLevel: 0 },
    });
    act(() => {
      rerender({ score: 30, rank: 1, scoreChange: 0, rankChange: 0, comboLevel: 0 });
    });
    expect(result.current).toBe('idle');
  });
});

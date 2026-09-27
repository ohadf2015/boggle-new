/**
 * Teacher pause — single client source of truth for "the round is frozen".
 *
 * One module-level store, read by the socket hook (writer), the page overlay,
 * and the local countdown tickers (PlayerView / MultiplayerInGameView). One
 * source so the overlay and the frozen clock can never disagree (pitfall 1).
 */
import { act, renderHook } from '@testing-library/react';
import { getTeacherPaused, setTeacherPaused, useTeacherPaused } from './useTeacherPause';

describe('useTeacherPause', () => {
  beforeEach(() => setTeacherPaused(false));

  it('starts unpaused', () => {
    expect(getTeacherPaused()).toBe(false);
    const { result } = renderHook(() => useTeacherPaused());
    expect(result.current).toBe(false);
  });

  it('re-renders subscribers when the flag flips', () => {
    const { result } = renderHook(() => useTeacherPaused());

    act(() => setTeacherPaused(true));
    expect(result.current).toBe(true);
    expect(getTeacherPaused()).toBe(true);

    act(() => setTeacherPaused(false));
    expect(result.current).toBe(false);
  });

  it('ignores no-op writes (no extra notifications)', () => {
    const { result } = renderHook(() => {
      const renders = (globalThis as any).__tpRenders = ((globalThis as any).__tpRenders ?? 0) + 1;
      return { paused: useTeacherPaused(), renders };
    });
    const before = result.current.renders;
    act(() => setTeacherPaused(false));
    expect(result.current.renders).toBe(before);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRevealStage } from '../useRevealStage';
import { buildRevealTimeline } from '../revealTimeline';

describe('useRevealStage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at stage 0 and walks the timeline beat by beat', () => {
    const tl = buildRevealTimeline(3);
    const { result } = renderHook(() => useRevealStage(tl, { instant: false }));
    expect(result.current.stage).toBe(0);
    act(() => { vi.advanceTimersByTime(tl.events[0].at); });
    expect(result.current.stage).toBeGreaterThanOrEqual(1);
    act(() => { vi.advanceTimersByTime(tl.doneAt); });
    expect(result.current.stage).toBe(tl.events.length);
    expect(result.current.done).toBe(true);
  });

  it('skip() jumps straight to the end', () => {
    const tl = buildRevealTimeline(4);
    const { result } = renderHook(() => useRevealStage(tl, { instant: false }));
    act(() => { result.current.skip(); });
    expect(result.current.stage).toBe(tl.events.length);
    expect(result.current.done).toBe(true);
  });

  it('reduced motion / instant starts at the end — no choreography', () => {
    const tl = buildRevealTimeline(4);
    const { result } = renderHook(() => useRevealStage(tl, { instant: true }));
    expect(result.current.stage).toBe(tl.events.length);
    expect(result.current.done).toBe(true);
  });

  it('calls onBeat once per beat with its name', () => {
    const tl = buildRevealTimeline(2);
    const onBeat = vi.fn();
    renderHook(() => useRevealStage(tl, { instant: false, onBeat }));
    act(() => { vi.advanceTimersByTime(tl.doneAt + 100); });
    expect(onBeat.mock.calls.map((c) => c[0])).toEqual(tl.events.map((e) => e.name));
  });

  it('a skip does not replay beats later, and clears pending timers', () => {
    const tl = buildRevealTimeline(4);
    const onBeat = vi.fn();
    const { result } = renderHook(() => useRevealStage(tl, { instant: false, onBeat }));
    act(() => { result.current.skip(); });
    const calls = onBeat.mock.calls.length;
    act(() => { vi.advanceTimersByTime(tl.doneAt + 100); });
    expect(onBeat.mock.calls.length).toBe(calls);
  });
});

/**
 * useEntryPhaseHandlers Tests
 *
 * Centralises the cascade-complete + entry-phase-complete callbacks and the
 * matching hint-timer cleanup that AdventureGame previously owned inline.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntryPhaseHandlers } from '../useEntryPhaseHandlers';

type Props = Parameters<typeof useEntryPhaseHandlers>[0];

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    markCascadeComplete: vi.fn(),
    advanceToPlaying: vi.fn(),
    isPlaying: false,
    startGame: vi.fn(),
    startAIDirector: vi.fn(),
    freeStartHint: false,
    getHint: vi.fn(),
    ...overrides,
  };
}

describe('useEntryPhaseHandlers', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('handleCascadeComplete marks cascade, advances, starts game when not playing', () => {
    const p = baseProps();
    const { result } = renderHook(() => useEntryPhaseHandlers(p));
    act(() => result.current.handleCascadeComplete());
    expect(p.markCascadeComplete).toHaveBeenCalledTimes(1);
    expect(p.advanceToPlaying).toHaveBeenCalledTimes(1);
    expect(p.startGame).toHaveBeenCalledTimes(1);
    expect(p.startAIDirector).toHaveBeenCalledTimes(1);
  });

  it('handleCascadeComplete skips startGame when already playing', () => {
    const p = baseProps({ isPlaying: true });
    const { result } = renderHook(() => useEntryPhaseHandlers(p));
    act(() => result.current.handleCascadeComplete());
    expect(p.startGame).not.toHaveBeenCalled();
    expect(p.startAIDirector).not.toHaveBeenCalled();
  });

  it('handleCascadeComplete schedules free-start hint after 500ms', () => {
    const p = baseProps({ freeStartHint: true });
    const { result } = renderHook(() => useEntryPhaseHandlers(p));
    act(() => result.current.handleCascadeComplete());
    expect(p.getHint).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(500); });
    expect(p.getHint).toHaveBeenCalledTimes(1);
  });

  it('handleEntryPhaseComplete advances + starts game', () => {
    const p = baseProps();
    const { result } = renderHook(() => useEntryPhaseHandlers(p));
    act(() => result.current.handleEntryPhaseComplete());
    expect(p.advanceToPlaying).toHaveBeenCalledTimes(1);
    expect(p.startGame).toHaveBeenCalledTimes(1);
    expect(p.startAIDirector).toHaveBeenCalledTimes(1);
  });

  it('clears pending hint timer on unmount', () => {
    const p = baseProps({ freeStartHint: true });
    const { result, unmount } = renderHook(() => useEntryPhaseHandlers(p));
    act(() => result.current.handleCascadeComplete());
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(p.getHint).not.toHaveBeenCalled();
  });
});

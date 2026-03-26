/**
 * useCinematic Stall Detection Tests
 *
 * Tests for detecting when Remotion Player fails to emit frameupdate events
 * (black screen on mobile). If no frame update arrives within STALL_DETECTION_MS
 * after playback starts, isStalled becomes true.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCinematic,
  STALL_DETECTION_MS,
} from '../useCinematic';

vi.useFakeTimers();

describe('useCinematic - stall detection', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should export STALL_DETECTION_MS constant', () => {
    expect(STALL_DETECTION_MS).toBe(3000);
  });

  it('should return isStalled as false initially', () => {
    const { result } = renderHook(() => useCinematic());

    expect(result.current.isStalled).toBe(false);
  });

  it('should set isStalled to true when no frameupdate fires within STALL_DETECTION_MS', () => {
    const { result } = renderHook(() => useCinematic({ autoPlay: true }));

    expect(result.current.isStalled).toBe(false);

    // Advance past stall detection threshold without calling handleFrameUpdate
    act(() => {
      vi.advanceTimersByTime(STALL_DETECTION_MS + 50);
    });

    expect(result.current.isStalled).toBe(true);
  });

  it('should NOT set isStalled when handleFrameUpdate is called before timeout', () => {
    const { result } = renderHook(() => useCinematic({ autoPlay: true }));

    // Simulate a frame update arriving before the stall timeout
    act(() => {
      vi.advanceTimersByTime(500); // half the stall time
      result.current.handleFrameUpdate(1);
    });

    // Now advance past the original stall detection time
    act(() => {
      vi.advanceTimersByTime(STALL_DETECTION_MS);
    });

    expect(result.current.isStalled).toBe(false);
  });

  it('should not detect stall when autoPlay is false (not playing)', () => {
    const { result } = renderHook(() => useCinematic({ autoPlay: false }));

    act(() => {
      vi.advanceTimersByTime(STALL_DETECTION_MS + 50);
    });

    expect(result.current.isStalled).toBe(false);
  });

  it('should not detect stall after cinematic has completed', () => {
    const { result } = renderHook(() =>
      useCinematic({ autoPlay: true, durationFrames: 100 })
    );

    // Complete the cinematic naturally
    act(() => {
      result.current.handleFrameUpdate(99);
    });

    expect(result.current.isComplete).toBe(true);

    // Stall timer should not fire after completion
    act(() => {
      vi.advanceTimersByTime(STALL_DETECTION_MS + 50);
    });

    expect(result.current.isStalled).toBe(false);
  });

  it('should reset isStalled when reset() is called', () => {
    const { result } = renderHook(() => useCinematic({ autoPlay: true }));

    // Let it stall
    act(() => {
      vi.advanceTimersByTime(STALL_DETECTION_MS + 50);
    });

    expect(result.current.isStalled).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.isStalled).toBe(false);
  });
});

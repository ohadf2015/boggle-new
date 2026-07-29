/**
 * useCinematic Hook Tests
 *
 * Tests for cinematic playback state management and skip timing.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCinematic,
  SKIP_DELAY_MS,
  DEFAULT_DURATION_FRAMES,
  DEFAULT_FPS,
  secondsToFrames,
  framesToSeconds,
  framesToMs,
} from '../useCinematic';

// Mock timers for skip delay testing
vi.useFakeTimers();

describe('useCinematic', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start playing by default when autoPlay is true', () => {
      const { result } = renderHook(() => useCinematic());

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.canSkip).toBe(false);
      expect(result.current.currentFrame).toBe(0);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    it('should not start playing when autoPlay is false', () => {
      const { result } = renderHook(() =>
        useCinematic({ autoPlay: false })
      );

      expect(result.current.isPlaying).toBe(false);
    });

    it('should use default duration when not specified', () => {
      const { result } = renderHook(() => useCinematic());

      expect(result.current.durationFrames).toBe(DEFAULT_DURATION_FRAMES);
    });

    it('should use custom duration when specified', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 300 })
      );

      expect(result.current.durationFrames).toBe(300);
    });
  });

  describe('skip timing (BOSS-04 requirement)', () => {
    it('should not allow skip immediately', () => {
      const { result } = renderHook(() => useCinematic());

      expect(result.current.canSkip).toBe(false);
    });

    it('should enable skip after SKIP_DELAY_MS (2 seconds)', () => {
      const { result } = renderHook(() => useCinematic());

      expect(result.current.canSkip).toBe(false);

      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS);
      });

      expect(result.current.canSkip).toBe(true);
    });

    it('should call onSkipAvailable when skip becomes enabled', () => {
      const onSkipAvailable = vi.fn();
      renderHook(() =>
        useCinematic({ onSkipAvailable })
      );

      expect(onSkipAvailable).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS);
      });

      expect(onSkipAvailable).toHaveBeenCalledTimes(1);
    });

    it('should not enable skip before SKIP_DELAY_MS', () => {
      const { result } = renderHook(() => useCinematic());

      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS - 100);
      });

      expect(result.current.canSkip).toBe(false);
    });
  });

  describe('skip function', () => {
    it('should not skip when canSkip is false', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useCinematic({ onComplete })
      );

      act(() => {
        result.current.skip();
      });

      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.isComplete).toBe(false);
    });

    it('should complete when skip is called after delay', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useCinematic({ onComplete })
      );

      // Enable skip
      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS);
      });

      // Skip
      act(() => {
        result.current.skip();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.isPlaying).toBe(false);
    });

    it('should not call onComplete multiple times', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useCinematic({ onComplete })
      );

      // Enable skip
      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS);
      });

      // Skip multiple times
      act(() => {
        result.current.skip();
        result.current.skip();
        result.current.skip();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('frame updates', () => {
    it('should update current frame via handleFrameUpdate', () => {
      const { result } = renderHook(() => useCinematic());

      act(() => {
        result.current.handleFrameUpdate(50);
      });

      expect(result.current.currentFrame).toBe(50);
    });

    it('should calculate progress based on current frame', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100 })
      );

      act(() => {
        result.current.handleFrameUpdate(50);
      });

      expect(result.current.progress).toBe(50);
    });

    it('should clamp progress at 100', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100 })
      );

      act(() => {
        result.current.handleFrameUpdate(150);
      });

      expect(result.current.progress).toBe(100);
    });

    it('should call onFrameChange when frame updates', () => {
      const onFrameChange = vi.fn();
      const { result } = renderHook(() =>
        useCinematic({ onFrameChange })
      );

      act(() => {
        result.current.handleFrameUpdate(30);
      });

      expect(onFrameChange).toHaveBeenCalledWith(30);
    });
  });

  describe('natural completion', () => {
    it('should complete when reaching last frame', () => {
      const onComplete = vi.fn();
      const durationFrames = 100;
      const { result } = renderHook(() =>
        useCinematic({ durationFrames, onComplete })
      );

      act(() => {
        result.current.handleFrameUpdate(durationFrames - 1);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.isPlaying).toBe(false);
    });

    it('should not complete before last frame', () => {
      const onComplete = vi.fn();
      const durationFrames = 100;
      const { result } = renderHook(() =>
        useCinematic({ durationFrames, onComplete })
      );

      act(() => {
        result.current.handleFrameUpdate(durationFrames - 2);
      });

      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.isComplete).toBe(false);
    });
  });

  describe('playback controls', () => {
    it('should pause playback', () => {
      const { result } = renderHook(() => useCinematic());

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should resume playback with play', () => {
      const { result } = renderHook(() =>
        useCinematic({ autoPlay: false })
      );

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should not resume playback after completion', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100 })
      );

      // Complete the cinematic
      act(() => {
        result.current.handleFrameUpdate(99);
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.isPlaying).toBe(false);

      // Try to play
      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100 })
      );

      // Progress the cinematic
      act(() => {
        vi.advanceTimersByTime(SKIP_DELAY_MS);
        result.current.handleFrameUpdate(50);
      });

      expect(result.current.canSkip).toBe(true);
      expect(result.current.currentFrame).toBe(50);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.canSkip).toBe(false);
      expect(result.current.currentFrame).toBe(0);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    it('should allow re-completion after reset', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100, onComplete })
      );

      // Complete first time
      act(() => {
        result.current.handleFrameUpdate(99);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Complete again
      act(() => {
        result.current.handleFrameUpdate(99);
      });

      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 0 })
      );

      expect(result.current.progress).toBe(0);
    });

    it('should handle negative frame updates gracefully', () => {
      const { result } = renderHook(() =>
        useCinematic({ durationFrames: 100 })
      );

      act(() => {
        result.current.handleFrameUpdate(-10);
      });

      // Should still track the frame (Remotion might send negative values during scrubbing)
      expect(result.current.currentFrame).toBe(-10);
    });
  });
});

describe('utility functions', () => {
  describe('secondsToFrames', () => {
    it('should convert seconds to frames at default FPS', () => {
      expect(secondsToFrames(1)).toBe(30);
      expect(secondsToFrames(2)).toBe(60);
      expect(secondsToFrames(8)).toBe(240);
    });

    it('should convert seconds to frames at custom FPS', () => {
      expect(secondsToFrames(1, 60)).toBe(60);
      expect(secondsToFrames(2, 24)).toBe(48);
    });

    it('should round to nearest frame', () => {
      expect(secondsToFrames(0.5, 30)).toBe(15);
      expect(secondsToFrames(1.1, 30)).toBe(33);
    });
  });

  describe('framesToSeconds', () => {
    it('should convert frames to seconds at default FPS', () => {
      expect(framesToSeconds(30)).toBe(1);
      expect(framesToSeconds(60)).toBe(2);
      expect(framesToSeconds(240)).toBe(8);
    });

    it('should convert frames to seconds at custom FPS', () => {
      expect(framesToSeconds(60, 60)).toBe(1);
      expect(framesToSeconds(48, 24)).toBe(2);
    });
  });

  describe('framesToMs', () => {
    it('should convert frames to milliseconds at default FPS', () => {
      expect(framesToMs(30)).toBe(1000);
      expect(framesToMs(60)).toBe(2000);
      expect(framesToMs(15)).toBe(500);
    });

    it('should convert frames to milliseconds at custom FPS', () => {
      expect(framesToMs(60, 60)).toBe(1000);
      expect(framesToMs(24, 24)).toBe(1000);
    });
  });
});

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHintPrompt } from '../useHintPrompt';

describe('useHintPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should not show hint prompt initially', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      expect(result.current.showHintPrompt).toBe(false);
    });

    it('should initialize lastWordFoundTimeRef', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      // After first interval check, the ref should be initialized
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.lastWordFoundTimeRef.current).toBeGreaterThan(0);
    });
  });

  describe('hint prompt timing', () => {
    it('should show hint prompt after 5 seconds of inactivity', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      expect(result.current.showHintPrompt).toBe(false);

      // Advance time past the 5 second threshold
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(result.current.showHintPrompt).toBe(true);
    });

    it('should not show hint prompt if game is paused', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: true,
          isGameOver: false,
          hasGrid: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(result.current.showHintPrompt).toBe(false);
    });

    it('should not show hint prompt if game is over', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: true,
          hasGrid: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(result.current.showHintPrompt).toBe(false);
    });

    it('should not show hint prompt if no grid', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(result.current.showHintPrompt).toBe(false);
    });
  });

  describe('dismissHintPrompt', () => {
    it('should hide hint prompt when dismissed', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      // Show the prompt
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(result.current.showHintPrompt).toBe(true);

      // Dismiss it
      act(() => {
        result.current.dismissHintPrompt();
      });

      expect(result.current.showHintPrompt).toBe(false);
    });
  });

  describe('resetInactivityTimer', () => {
    it('should reset timer and hide prompt when word is found', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      // Show the prompt
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(result.current.showHintPrompt).toBe(true);

      // Reset (simulating finding a word)
      act(() => {
        result.current.resetInactivityTimer();
      });

      expect(result.current.showHintPrompt).toBe(false);
    });

    it('should prevent prompt from showing again after reset until timeout', () => {
      const { result } = renderHook(() =>
        useHintPrompt({
          isPaused: false,
          isGameOver: false,
          hasGrid: true,
        })
      );

      // Wait some time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Reset (player found a word)
      act(() => {
        result.current.resetInactivityTimer();
      });

      // Wait less than 5 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.showHintPrompt).toBe(false);

      // Wait past the 5 second threshold
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.showHintPrompt).toBe(true);
    });
  });
});

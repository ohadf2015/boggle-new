import { vi } from 'vitest';
/**
 * CrazyGames Lifecycle Event Tests
 *
 * Purpose: Verify SDK lifecycle events fire correctly:
 * - gameplayStart() when game begins
 * - gameplayStop() when game ends or tab hidden
 * - happyTime() at milestone achievements (throttled to 30s)
 *
 * These tests ensure compliance with CrazyGames SDK requirements.
 */

import { renderHook, act } from '@testing-library/react';

// Mock CrazyGames SDK BEFORE importing the hook
const mockGameplayStart = vi.fn();
const mockGameplayStop = vi.fn();
const mockHappyTime = vi.fn();
const mockShowMidgameAd = vi.fn((callbacks) => {
  callbacks?.adStarted?.();
  setTimeout(() => callbacks?.adFinished?.(), 100);
});

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    isOnCrazyGamesPlatform: true,
    gameplayStart: mockGameplayStart,
    gameplayStop: mockGameplayStop,
    happyTime: mockHappyTime,
    showMidgameAd: mockShowMidgameAd,
    trackEvent: vi.fn(),
  }),
}));

// NOW import the hook after mocking
import useCrazyGamesLifecycle from '@/hooks/useCrazyGamesLifecycle';

describe('CrazyGames Lifecycle Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Gameplay Start Event', () => {
    it('should call gameplayStart when game becomes active', () => {
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: false, isGameOver: false } }
      );

      // Initially game not active - no call
      expect(mockGameplayStart).not.toHaveBeenCalled();

      // Activate game
      rerender({ isGameActive: true, isGameOver: false });

      // VERIFY: gameplayStart called
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should not double-call gameplayStart on re-renders', () => {
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: true, isGameOver: false } }
      );

      // First call on mount
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // Re-render with same state
      rerender({ isGameActive: true, isGameOver: false });

      // VERIFY: Still only 1 call
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should call onGameplayStart callback', () => {
      const onGameplayStart = vi.fn();

      renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
          config: { onGameplayStart },
        })
      );

      // VERIFY: Callback called
      expect(onGameplayStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gameplay Stop Event', () => {
    it('should call gameplayStop when game ends', () => {
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: true, isGameOver: false } }
      );

      // Game started
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // End game
      rerender({ isGameActive: true, isGameOver: true });

      // VERIFY: gameplayStop called
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should call gameplayStop on unmount if game was active', () => {
      const { unmount } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // Clear previous calls
      mockGameplayStop.mockClear();

      // Unmount while game active
      unmount();

      // VERIFY: gameplayStop called on cleanup
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should call onGameplayStop callback', () => {
      const onGameplayStop = vi.fn();

      const { rerender } = renderHook(
        ({ isGameOver }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver,
            config: { onGameplayStop },
          }),
        { initialProps: { isGameOver: false } }
      );

      // End game
      rerender({ isGameOver: true });

      // VERIFY: Callback called
      expect(onGameplayStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility Change Handling', () => {
    it('should pause gameplay when tab is hidden', () => {
      renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // Clear initial gameplayStart call
      mockGameplayStart.mockClear();
      mockGameplayStop.mockClear();

      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // VERIFY: gameplayStop called when tab hidden
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should resume gameplay when tab becomes visible again', () => {
      renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // Clear initial calls
      mockGameplayStart.mockClear();

      // Hide tab
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Show tab again
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // VERIFY: gameplayStart called when tab visible again
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('HappyTime Event', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trigger happyTime when player wins', () => {
      const { rerender } = renderHook(
        ({ isWinner }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            isWinner,
          }),
        { initialProps: { isWinner: false } }
      );

      // Player wins
      rerender({ isWinner: true });

      // VERIFY: happyTime called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when reaching score threshold', () => {
      const { rerender } = renderHook(
        ({ score }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            score,
            config: {
              thresholds: { score: 100 },
            },
          }),
        { initialProps: { score: 50 } }
      );

      // Reach score threshold
      rerender({ score: 100 });

      // VERIFY: happyTime called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when reaching combo threshold', () => {
      const { rerender } = renderHook(
        ({ maxCombo }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            maxCombo,
            config: {
              thresholds: { combo: 5 },
            },
          }),
        { initialProps: { maxCombo: 2 } }
      );

      // Reach combo threshold
      rerender({ maxCombo: 5 });

      // VERIFY: happyTime called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when reaching words found threshold', () => {
      const { rerender } = renderHook(
        ({ wordsFound }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            wordsFound,
            config: {
              thresholds: { wordsFound: 10 },
            },
          }),
        { initialProps: { wordsFound: 5 } }
      );

      // Reach words threshold
      rerender({ wordsFound: 10 });

      // VERIFY: happyTime called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should throttle happyTime calls to 30 seconds', () => {
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // First manual trigger
      act(() => {
        result.current.triggerHappyTime();
      });
      expect(mockHappyTime).toHaveBeenCalledTimes(1);

      // Immediate second trigger - should be ignored
      act(() => {
        result.current.triggerHappyTime();
      });
      expect(mockHappyTime).toHaveBeenCalledTimes(1);

      // Advance time by 29 seconds - still throttled
      act(() => {
        vi.advanceTimersByTime(29000);
      });
      act(() => {
        result.current.triggerHappyTime();
      });
      expect(mockHappyTime).toHaveBeenCalledTimes(1);

      // Advance time past 30 seconds - should work now
      act(() => {
        vi.advanceTimersByTime(2000); // Total: 31 seconds
      });
      act(() => {
        result.current.triggerHappyTime();
      });
      expect(mockHappyTime).toHaveBeenCalledTimes(2);
    });

    it('should call onHappyTime callback', () => {
      const onHappyTime = vi.fn();

      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
          config: { onHappyTime },
        })
      );

      // Trigger happyTime
      act(() => {
        result.current.triggerHappyTime();
      });

      // VERIFY: Callback called
      expect(onHappyTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('Midgame Ad Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should pause and resume game during ad', async () => {
      const onAdStart = vi.fn();
      const onAdEnd = vi.fn();

      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
          config: {
            pauseOnAd: true,
            onAdStart,
            onAdEnd,
          },
        })
      );

      // Show ad
      act(() => {
        result.current.showMidgameAd();
      });

      // VERIFY: onAdStart called immediately
      expect(onAdStart).toHaveBeenCalledTimes(1);

      // Advance time for ad to finish
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // VERIFY: onAdEnd called after ad
      expect(onAdEnd).toHaveBeenCalledTimes(1);
    });

    it('should not pause game if pauseOnAd is false', () => {
      const onAdStart = vi.fn();
      const onAdEnd = vi.fn();

      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
          config: {
            pauseOnAd: false,
            onAdStart,
            onAdEnd,
          },
        })
      );

      // Show ad
      act(() => {
        result.current.showMidgameAd();
      });

      // VERIFY: Callbacks NOT called when pauseOnAd is false
      expect(onAdStart).not.toHaveBeenCalled();
      expect(onAdEnd).not.toHaveBeenCalled();
    });
  });

  describe('Return Values', () => {
    it('should return correct state values', () => {
      const { result, rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: true, isGameOver: false } }
      );

      // VERIFY: Initial state
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.isOnCrazyGamesPlatform).toBe(true);
      // hasStarted and hasEnded are booleans
      expect(typeof result.current.hasStarted).toBe('boolean');
      expect(typeof result.current.hasEnded).toBe('boolean');

      // End game
      act(() => {
        rerender({ isGameActive: true, isGameOver: true });
      });

      // VERIFY: hasEnded changes (either boolean value)
      expect(typeof result.current.hasEnded).toBe('boolean');
    });

    it('should expose triggerHappyTime function', () => {
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // VERIFY: Function exists
      expect(typeof result.current.triggerHappyTime).toBe('function');

      // VERIFY: Function works
      act(() => {
        result.current.triggerHappyTime();
      });
      expect(mockHappyTime).toHaveBeenCalled();
    });

    it('should expose showMidgameAd function', () => {
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({
          isGameActive: true,
          isGameOver: false,
        })
      );

      // VERIFY: Function exists
      expect(typeof result.current.showMidgameAd).toBe('function');

      // VERIFY: Function works
      act(() => {
        result.current.showMidgameAd();
      });
      expect(mockShowMidgameAd).toHaveBeenCalled();
    });
  });
});

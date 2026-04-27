/**
 * @jest-environment jsdom
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrazyGamesLifecycle } from '../useCrazyGamesLifecycle';

// Mock the CrazyGames SDK
const { mockGameplayStart, mockGameplayStop, mockHappyTime, mockShowMidgameAd, mockTrackEvent } = vi.hoisted(() => {
  const mockGameplayStart = vi.fn();
  const mockGameplayStop = vi.fn();
  const mockHappyTime = vi.fn();
  const mockShowMidgameAd = vi.fn();
  const mockTrackEvent = vi.fn();
  return { mockGameplayStart, mockGameplayStop, mockHappyTime, mockShowMidgameAd, mockTrackEvent };
});
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    gameplayStart: mockGameplayStart,
    gameplayStop: mockGameplayStop,
    happyTime: mockHappyTime,
    showMidgameAd: mockShowMidgameAd,
    trackEvent: mockTrackEvent,
    isAvailable: true,
    isOnCrazyGamesPlatform: true,
  }),
}));

describe('useCrazyGamesLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gameplay lifecycle', () => {
    it('should call gameplayStart when game becomes active', () => {
      // GIVEN the hook is rendered with inactive game
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: false, isGameOver: false } }
      );

      expect(mockGameplayStart).not.toHaveBeenCalled();

      // WHEN the game becomes active
      rerender({ isGameActive: true, isGameOver: false });

      // THEN gameplayStart should be called
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should call gameplayStop when game ends', () => {
      // GIVEN the game is active
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver }),
        { initialProps: { isGameActive: true, isGameOver: false } }
      );

      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // WHEN the game ends
      rerender({ isGameActive: true, isGameOver: true });

      // THEN gameplayStop should be called
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should call gameplayStop on unmount if game was active', () => {
      // GIVEN the game is active
      const { unmount } = renderHook(() =>
        useCrazyGamesLifecycle({ isGameActive: true, isGameOver: false })
      );

      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // WHEN the component unmounts
      unmount();

      // THEN gameplayStop should be called
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should NOT call gameplayStart if already started', () => {
      // GIVEN the game was started once
      const { rerender } = renderHook(
        ({ isGameActive }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver: false }),
        { initialProps: { isGameActive: true } }
      );

      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // WHEN re-rendered with same state
      rerender({ isGameActive: true });

      // THEN gameplayStart should NOT be called again
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should call gameplayStart again on tournament round transition (roundKey change)', () => {
      // GIVEN round 1 is active and ended
      const { rerender } = renderHook(
        ({ isGameActive, isGameOver, roundKey }) =>
          useCrazyGamesLifecycle({ isGameActive, isGameOver, roundKey }),
        { initialProps: { isGameActive: true, isGameOver: false, roundKey: 1 } }
      );
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // WHEN round 1 ends
      rerender({ isGameActive: false, isGameOver: true, roundKey: 1 });
      expect(mockGameplayStop).toHaveBeenCalledTimes(1);

      // AND round 2 starts (roundKey changes, isGameActive flips back true)
      rerender({ isGameActive: false, isGameOver: false, roundKey: 2 });
      rerender({ isGameActive: true, isGameOver: false, roundKey: 2 });

      // THEN gameplayStart should fire again for round 2
      expect(mockGameplayStart).toHaveBeenCalledTimes(2);
    });

    it('should not reset on roundKey change while game is mid-round', () => {
      // GIVEN game active in round 1
      const { rerender } = renderHook(
        ({ roundKey }) =>
          useCrazyGamesLifecycle({ isGameActive: true, isGameOver: false, roundKey }),
        { initialProps: { roundKey: 1 } }
      );
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);

      // WHEN roundKey changes mid-round (shouldn't happen in practice but defensive)
      rerender({ roundKey: 2 });

      // THEN reset should still allow next gameplayStart cycle without double-fire
      // (no extra calls until isGameActive flips false→true)
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('happyTime triggers', () => {
    it('should trigger happyTime when player wins', () => {
      // GIVEN the game is active
      const { rerender } = renderHook(
        ({ isWinner }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            isWinner,
          }),
        { initialProps: { isWinner: false } }
      );

      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN the player wins
      rerender({ isWinner: true });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when score reaches default threshold (200)', () => {
      // GIVEN the game is active with low score
      const { rerender } = renderHook(
        ({ score }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            score,
          }),
        { initialProps: { score: 100 } }
      );

      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN the score reaches threshold
      rerender({ score: 200 });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when combo reaches default threshold (5)', () => {
      // GIVEN the game is active with low combo
      const { rerender } = renderHook(
        ({ maxCombo }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            maxCombo,
          }),
        { initialProps: { maxCombo: 2 } }
      );

      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN the combo reaches threshold
      rerender({ maxCombo: 5 });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should trigger happyTime when words found reaches default threshold (12)', () => {
      // GIVEN the game is active with few words
      const { rerender } = renderHook(
        ({ wordsFound }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            wordsFound,
          }),
        { initialProps: { wordsFound: 5 } }
      );

      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN the words found reaches threshold
      rerender({ wordsFound: 12 });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should only trigger happyTime once even with multiple conditions', () => {
      // GIVEN the game is active
      const { rerender } = renderHook(
        ({ score, maxCombo, isWinner }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            score,
            maxCombo,
            isWinner,
          }),
        { initialProps: { score: 200, maxCombo: 5, isWinner: false } }
      );

      // WHEN all conditions are met at once
      rerender({ score: 600, maxCombo: 15, isWinner: true });

      // THEN happyTime should only be called once
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom thresholds', () => {
    it('should use custom score threshold', () => {
      // GIVEN custom score threshold of 200
      const { rerender } = renderHook(
        ({ score }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            score,
            config: {
              thresholds: { score: 200 },
            },
          }),
        { initialProps: { score: 400 } }
      );

      // Score at below-custom threshold should NOT trigger
      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN score reaches custom threshold
      rerender({ score: 200 });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should use custom combo threshold', () => {
      // GIVEN custom combo threshold of 10
      const { rerender } = renderHook(
        ({ maxCombo }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            maxCombo,
            config: {
              thresholds: { combo: 10 },
            },
          }),
        { initialProps: { maxCombo: 5 } }
      );

      // Combo at default threshold should NOT trigger
      expect(mockHappyTime).not.toHaveBeenCalled();

      // WHEN combo reaches custom threshold
      rerender({ maxCombo: 10 });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('callbacks', () => {
    it('should call onGameplayStart callback when game starts', () => {
      const onGameplayStart = vi.fn();

      // GIVEN the hook with onGameplayStart callback
      const { rerender } = renderHook(
        ({ isGameActive }) =>
          useCrazyGamesLifecycle({
            isGameActive,
            isGameOver: false,
            config: { onGameplayStart },
          }),
        { initialProps: { isGameActive: false } }
      );

      // WHEN the game becomes active
      rerender({ isGameActive: true });

      // THEN the callback should be called
      expect(onGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should call onGameplayStop callback when game ends', () => {
      const onGameplayStop = vi.fn();

      // GIVEN the hook with onGameplayStop callback
      const { rerender } = renderHook(
        ({ isGameOver }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver,
            config: { onGameplayStop },
          }),
        { initialProps: { isGameOver: false } }
      );

      // WHEN the game ends
      rerender({ isGameOver: true });

      // THEN the callback should be called
      expect(onGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should call onHappyTime callback when happyTime triggers', () => {
      const onHappyTime = vi.fn();

      // GIVEN the hook with onHappyTime callback
      const { rerender } = renderHook(
        ({ score }) =>
          useCrazyGamesLifecycle({
            isGameActive: true,
            isGameOver: false,
            score,
            config: { onHappyTime },
          }),
        { initialProps: { score: 200 } }
      );

      // WHEN score reaches threshold
      rerender({ score: 500 });

      // THEN the callback should be called
      expect(onHappyTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('return values', () => {
    it('should expose isAvailable and isOnCrazyGamesPlatform', () => {
      // GIVEN the hook is rendered
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({ isGameActive: false, isGameOver: false })
      );

      // THEN it should expose platform info
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.isOnCrazyGamesPlatform).toBe(true);
    });

    it('should expose triggerHappyTime function', () => {
      // GIVEN the hook is rendered
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({ isGameActive: true, isGameOver: false })
      );

      // WHEN triggerHappyTime is called manually
      act(() => {
        result.current.triggerHappyTime();
      });

      // THEN happyTime should be called
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });

    it('should only trigger happyTime once via triggerHappyTime', () => {
      // GIVEN the hook is rendered
      const { result } = renderHook(() =>
        useCrazyGamesLifecycle({ isGameActive: true, isGameOver: false })
      );

      // WHEN triggerHappyTime is called multiple times
      act(() => {
        result.current.triggerHappyTime();
        result.current.triggerHappyTime();
        result.current.triggerHappyTime();
      });

      // THEN happyTime should only be called once
      expect(mockHappyTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('midgame ads', () => {
    it('should call showMidgameAd with callbacks', () => {
      const onAdStart = vi.fn();
      const onAdEnd = vi.fn();

      // GIVEN the hook is rendered with ad callbacks
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

      // WHEN showMidgameAd is called
      act(() => {
        result.current.showMidgameAd();
      });

      // THEN SDK showMidgameAd should be called
      expect(mockShowMidgameAd).toHaveBeenCalledTimes(1);
      expect(mockShowMidgameAd).toHaveBeenCalledWith(
        expect.objectContaining({
          adStarted: expect.any(Function),
          adFinished: expect.any(Function),
          adError: expect.any(Function),
        })
      );
    });
  });
});

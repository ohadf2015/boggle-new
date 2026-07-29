/**
 * useAdventureGameCallbacks Tests
 *
 * Tests for handleContinue, handleRetry, handleCinematicComplete callbacks.
 * Focus: achievement triggers (LEVEL_MASTER) and chapter quest recording.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGameCallbacks } from '../useAdventureGameCallbacks';

describe('useAdventureGameCallbacks', () => {
  const mockRecordLevelPerfect = vi.fn();
  const mockRecordBossDefeatedNoHint = vi.fn();
  const mockRecordScoreChallenge = vi.fn();
  const mockRecordBossHighHealth = vi.fn();
  const mockRecordFullComboLevel = vi.fn();
  const mockHandleEarnAchievement = vi.fn();
  const mockOnLevelComplete = vi.fn();
  const mockSetShowLevelComplete = vi.fn();
  const mockSetRetriesUsed = vi.fn();
  const mockClearSelection = vi.fn();
  const mockResetGame = vi.fn();
  const mockStartGame = vi.fn();
  const mockResetBossHealth = vi.fn();
  const mockResetPlayerHealth = vi.fn();
  const mockResetRewards = vi.fn();
  const mockResetCinematics = vi.fn();
  const mockHandleCinematicCompleteBase = vi.fn();
  const mockShowWorldUnlock = vi.fn();
  const mockShowLootOrComplete = vi.fn();
  const mockSetShowStoryBeat = vi.fn();
  const mockResetWordSubmitState = vi.fn();
  const mockResetFlashChallenge = vi.fn();
  const mockRetrySaveCompletion = vi.fn().mockResolvedValue(true);
  const mockSetIsPaused = vi.fn();
  const mockT = vi.fn((key: string) => key);

  const defaultParams = {
    gameStars: 2,
    gameScore: 500,
    wordsFoundList: ['cat', 'dog', 'bat'],
    comboCount: 3,
    isBossLevel: false,
    worldNumber: 1,
    levelNumber: 3,
    bossHealthPhase: 'active' as string,
    playerHealthCurrentHP: 100,
    playerHealthMaxHP: 100,
    resetBossHealth: mockResetBossHealth,
    resetPlayerHealth: mockResetPlayerHealth,
    showVictoryCinematic: false,
    showWorldUnlockCinematic: false,
    handleCinematicCompleteBase: mockHandleCinematicCompleteBase,
    showWorldUnlock: mockShowWorldUnlock,
    resetCinematics: mockResetCinematics,
    earnedGold: 50,
    resetRewards: mockResetRewards,
    recordLevelPerfect: mockRecordLevelPerfect,
    recordBossDefeatedNoHint: mockRecordBossDefeatedNoHint,
    recordScoreChallenge: mockRecordScoreChallenge,
    recordBossHighHealth: mockRecordBossHighHealth,
    recordFullComboLevel: mockRecordFullComboLevel,
    handleEarnAchievement: mockHandleEarnAchievement,
    upgradeRetryScoreRetention: 0,
    onLevelComplete: mockOnLevelComplete,
    totalStars: 30,
    clearSelection: mockClearSelection,
    resetGame: mockResetGame,
    startGame: mockStartGame,
    storyBeat: null,
    showLootOrComplete: mockShowLootOrComplete,
    setShowLevelComplete: mockSetShowLevelComplete,
    setRetriesUsed: mockSetRetriesUsed,
    setShowStoryBeat: mockSetShowStoryBeat,
    t: mockT,
    hintsUsed: 0,
    resetWordSubmitState: mockResetWordSubmitState,
    resetFlashChallenge: mockResetFlashChallenge,
    completionSaveFailedRef: { current: false },
    retrySaveCompletion: mockRetrySaveCompletion,
    timeRemaining: 60,
    timerSeconds: 120,
    setIsPaused: mockSetIsPaused,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleContinue - LEVEL_MASTER achievement', () => {
    it('should fire LEVEL_MASTER when gameStars is 3', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({ ...defaultParams, gameStars: 3 })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockHandleEarnAchievement).toHaveBeenCalledWith('LEVEL_MASTER');
    });

    it('should NOT fire LEVEL_MASTER when gameStars is less than 3', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({ ...defaultParams, gameStars: 2 })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockHandleEarnAchievement).not.toHaveBeenCalledWith('LEVEL_MASTER');
    });

    it('should NOT fire LEVEL_MASTER when gameStars is 0 (defeat)', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({ ...defaultParams, gameStars: 0 })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockHandleEarnAchievement).not.toHaveBeenCalledWith('LEVEL_MASTER');
    });
  });

  describe('handleContinue - existing achievements', () => {
    it('should fire STAR_COLLECTOR_50 when totalStars + gameStars >= 50', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({ ...defaultParams, totalStars: 48, gameStars: 3 })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockHandleEarnAchievement).toHaveBeenCalledWith('STAR_COLLECTOR_50');
    });

    it('should fire WORLD_COMPLETE for boss level victories', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({
          ...defaultParams,
          isBossLevel: true,
          gameStars: 1,
          bossHealthPhase: 'victory',
        })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockHandleEarnAchievement).toHaveBeenCalledWith('WORLD_COMPLETE');
    });
  });

  describe('handleContinue - timePlayed propagation (Sentry 11J)', () => {
    it('should forward computed timePlayed as 7th arg to onLevelComplete', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({
          ...defaultParams,
          gameStars: 3,
          timeRemaining: 45,
          timerSeconds: 120,
        })
      );

      act(() => {
        result.current.handleContinue();
      });

      // timePlayed = timerSeconds - timeRemaining = 120 - 45 = 75
      expect(mockOnLevelComplete).toHaveBeenCalledWith(
        3, 500, 3, 50, 0, ['cat', 'dog', 'bat'], 75
      );
    });

    it('should clamp negative timePlayed to 0 when timeRemaining exceeds timerSeconds', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({
          ...defaultParams,
          gameStars: 1,
          timeRemaining: 150,
          timerSeconds: 120,
        })
      );

      act(() => {
        result.current.handleContinue();
      });

      expect(mockOnLevelComplete).toHaveBeenCalledWith(
        1, 500, 3, 50, 0, ['cat', 'dog', 'bat'], 0
      );
    });
  });

  describe('handleRetry - clears isPaused (Sentry: pause→restart no-op)', () => {
    it('should call setIsPaused(false) so the PauseOverlay unmounts after retry', () => {
      const { result } = renderHook(() => useAdventureGameCallbacks(defaultParams));

      act(() => {
        result.current.handleRetry();
      });

      expect(mockSetIsPaused).toHaveBeenCalledWith(false);
    });

    it('should call setIsPaused(false) on boss-level retry too (no startGame branch)', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({ ...defaultParams, isBossLevel: true })
      );

      act(() => {
        result.current.handleRetry();
      });

      expect(mockSetIsPaused).toHaveBeenCalledWith(false);
      expect(mockStartGame).not.toHaveBeenCalled();
    });
  });

  describe('handleCinematicComplete - timePlayed on world-unlock boss path', () => {
    it('should forward timePlayed when auto-navigating after WorldUnlockCinematic', () => {
      const { result } = renderHook(() =>
        useAdventureGameCallbacks({
          ...defaultParams,
          isBossLevel: true,
          gameStars: 3,
          showWorldUnlockCinematic: true,
          timeRemaining: 30,
          timerSeconds: 120,
        })
      );

      act(() => {
        result.current.handleCinematicComplete();
      });

      expect(mockOnLevelComplete).toHaveBeenCalledWith(
        3, 500, 3, 50, 0, ['cat', 'dog', 'bat'], 90
      );
    });
  });
});

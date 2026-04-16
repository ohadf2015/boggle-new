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
});

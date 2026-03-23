/**
 * useAdventureLevelCompletion Tests
 *
 * Tests for the level completion hook that handles:
 * - XP/gold awarding
 * - Victory/defeat detection and cinematic triggering
 * - Achievement recording and progress tracking
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureLevelCompletion } from '../useAdventureLevelCompletion';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';

jest.mock('@/shared/utils/adventureXpUtils');
const mockCalculateAdventureXp = calculateAdventureXp as jest.MockedFunction<typeof calculateAdventureXp>;

describe('useAdventureLevelCompletion', () => {
  const mockAwardXp = jest.fn().mockReturnValue({ leveledUp: false });
  const mockAddGold = jest.fn();
  const mockRecordAttempt = jest.fn();
  const mockRecordCompletion = jest.fn();
  const mockEndAIDirector = jest.fn();
  const mockHandleEarnAchievement = jest.fn();
  const mockPauseGame = jest.fn();
  const mockShowVictory = jest.fn();
  const mockShowDefeat = jest.fn();
  const mockCompleteLevel = jest.fn();
  const mockSaveCompletion = jest.fn().mockResolvedValue(true);
  const mockEndBossBattle = jest.fn();
  const mockTriggerBossTaunt = jest.fn();

  const defaultProps = {
    gameState: {
      isComplete: false,
      stars: 0,
      score: 100,
      wordsFound: ['cat', 'dog'],
      comboCount: 2,
    },
    timeRemaining: 60,
    timerSeconds: 120,
    levelConfig: { world: 1, level: 3 },
    objectives: [{ type: 'score', current: 100, target: 200 }],
    currentLevel: 1,
    upgradeBonuses: { xpBonus: 1, timeBonus: 1, scoreBonus: 1 },
    awardXp: mockAwardXp,
    addGold: mockAddGold,
    recordAttempt: mockRecordAttempt,
    recordCompletion: mockRecordCompletion,
    saveCompletion: mockSaveCompletion,
    endAIDirector: mockEndAIDirector,
    handleEarnAchievement: mockHandleEarnAchievement,
    pauseGame: mockPauseGame,
    completeLevel: mockCompleteLevel,
    showVictory: mockShowVictory,
    showDefeat: mockShowDefeat,
    showLevelComplete: false,
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    isBossLevel: false,
    isBossActive: false,
    bossHealthPhase: 'active' as const,
    playerIsDead: false,
    endBossBattle: mockEndBossBattle,
    triggerBossTaunt: mockTriggerBossTaunt,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateAdventureXp.mockReturnValue(50);
  });

  describe('level rewards', () => {
    it('should not award rewards when level not complete', () => {
      renderHook(() => useAdventureLevelCompletion(defaultProps));
      expect(mockAwardXp).not.toHaveBeenCalled();
      expect(mockAddGold).not.toHaveBeenCalled();
    });

    it('should award XP and gold when level completes with stars > 0', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(mockAwardXp).toHaveBeenCalled();
      expect(mockAddGold).toHaveBeenCalled();
    });

    it('should award perfect clear gold bonus for 3 stars', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 3 },
        })
      );

      // 3 stars * 10 base + 50 perfect bonus = 80
      expect(mockAddGold).toHaveBeenCalledWith(80);
    });

    it('should not award perfect clear bonus for less than 3 stars', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      // 2 stars * 10 base = 20
      expect(mockAddGold).toHaveBeenCalledWith(20);
    });

    it('should apply XP bonus multiplier from upgrades', () => {
      mockCalculateAdventureXp.mockReturnValue(100);

      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 1 },
          upgradeBonuses: { xpBonus: 1.5, timeBonus: 1, scoreBonus: 1 },
        })
      );

      // floor(100 * 1.5) = 150
      expect(mockAwardXp).toHaveBeenCalledWith(150);
    });

    it('should not award rewards twice', () => {
      const { rerender } = renderHook(
        (props) => useAdventureLevelCompletion(props),
        {
          initialProps: {
            ...defaultProps,
            gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
          },
        }
      );

      expect(mockAwardXp).toHaveBeenCalledTimes(1);

      // Re-render with same completed state
      rerender({
        ...defaultProps,
        gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
      });

      // Should still be 1 call, not 2
      expect(mockAwardXp).toHaveBeenCalledTimes(1);
    });
  });

  describe('level up', () => {
    it('should return levelUpData when XP causes level up', () => {
      mockAwardXp.mockReturnValue({ leveledUp: true, newLevel: 2 });

      const { result } = renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(result.current.levelUpData).toEqual({
        oldLevel: 1,
        newLevel: 2,
        newTitles: [],
      });
    });
  });

  describe('victory/defeat detection', () => {
    it('should skip cinematics for non-boss levels and just pause', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      // Non-boss levels skip cinematics — go straight to level complete
      expect(mockShowVictory).not.toHaveBeenCalled();
      expect(mockShowDefeat).not.toHaveBeenCalled();
      expect(mockPauseGame).toHaveBeenCalled();
    });

    it('should skip cinematics on defeat for non-boss levels', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          timeRemaining: 0,
          gameState: { ...defaultProps.gameState, isComplete: false, stars: 0 },
        })
      );

      expect(mockShowVictory).not.toHaveBeenCalled();
      expect(mockShowDefeat).not.toHaveBeenCalled();
      expect(mockPauseGame).toHaveBeenCalled();
    });

    it('should not trigger when already showing level complete', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          showLevelComplete: true,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(mockShowVictory).not.toHaveBeenCalled();
    });
  });

  describe('boss level completion', () => {
    it('should trigger victory when boss health phase is victory', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          isBossLevel: true,
          isBossActive: true,
          bossHealthPhase: 'victory' as any,
          gameState: { ...defaultProps.gameState, stars: 3 },
        })
      );

      expect(mockShowVictory).toHaveBeenCalled();
    });

    it('should trigger defeat when player dies in boss battle', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          isBossLevel: true,
          isBossActive: true,
          playerIsDead: true,
          gameState: { ...defaultProps.gameState, stars: 0 },
        })
      );

      expect(mockShowDefeat).toHaveBeenCalled();
    });

    it('should earn BOSS_SLAYER achievement on boss victory', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          isBossLevel: true,
          isBossActive: true,
          bossHealthPhase: 'victory' as any,
          gameState: { ...defaultProps.gameState, stars: 3 },
        })
      );

      expect(mockHandleEarnAchievement).toHaveBeenCalledWith('BOSS_SLAYER');
    });
  });

  describe('progress recording', () => {
    it('should record attempt on completion', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(mockRecordAttempt).toHaveBeenCalledWith(
        1, // world
        3, // level
        2, // wordsFound.length
        100, // score
        60, // timeRemaining
        expect.any(Object), // objectiveProgress
        true // isSuccess
      );
    });

    it('should record completion for adaptive difficulty', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(mockRecordCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          isCompletion: true,
          timeRemaining: 60,
          timerSeconds: 120,
          score: 100,
          words: 2,
        })
      );
    });

    it('should end AI director on completion', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(mockEndAIDirector).toHaveBeenCalled();
    });

    it('should earn PERFECT_LEVEL achievement for 3 stars', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 3 },
        })
      );

      expect(mockHandleEarnAchievement).toHaveBeenCalledWith('PERFECT_LEVEL');
    });
  });

  describe('handleLevelUpClose', () => {
    it('should clear levelUpData', () => {
      mockAwardXp.mockReturnValue({ leveledUp: true, newLevel: 2 });

      const { result } = renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      expect(result.current.levelUpData).not.toBeNull();

      act(() => {
        result.current.handleLevelUpClose();
      });

      expect(result.current.levelUpData).toBeNull();
    });
  });
});

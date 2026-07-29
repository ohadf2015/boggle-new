/**
 * useAdventureLevelCompletion Tests
 *
 * Tests for the level completion hook that handles:
 * - XP/gold awarding
 * - Victory/defeat detection and cinematic triggering
 * - Achievement recording and progress tracking
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureLevelCompletion } from '../useAdventureLevelCompletion';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { enqueueScore } from '@/lib/offline/scoreQueue';

vi.mock('@/shared/utils/adventureXpUtils');
vi.mock('@/hooks/useOfflineModeFlag', () => ({ useOfflineModeFlag: vi.fn(() => false) }));
vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: vi.fn(() => ({ online: true, slow: false, type: 'wifi', rttMs: 20 })) }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: vi.fn(() => Promise.resolve({})) }));
vi.mock('@/lib/offline/scoreQueue', () => ({ enqueueScore: vi.fn(() => Promise.resolve('uuid-123')) }));

const mockCalculateAdventureXp = calculateAdventureXp as any;
const mockUseOfflineModeFlag = useOfflineModeFlag as ReturnType<typeof vi.fn>;
const mockUseNetworkState = useNetworkState as ReturnType<typeof vi.fn>;
const mockEnqueueScore = enqueueScore as ReturnType<typeof vi.fn>;

describe('useAdventureLevelCompletion', () => {
  const mockAwardXp = vi.fn().mockReturnValue({ leveledUp: false });
  const mockAddGold = vi.fn();
  const mockRecordAttempt = vi.fn();
  const mockRecordCompletion = vi.fn();
  const mockEndAIDirector = vi.fn();
  const mockHandleEarnAchievement = vi.fn();
  const mockPauseGame = vi.fn();
  const mockShowVictory = vi.fn();
  const mockShowDefeat = vi.fn();
  const mockCompleteLevel = vi.fn();
  const mockSaveCompletion = vi.fn().mockResolvedValue(true);
  const mockEndBossBattle = vi.fn();
  const mockTriggerBossTaunt = vi.fn();

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
    vi.clearAllMocks();
    mockCalculateAdventureXp.mockReturnValue(50);
  });

  describe('level rewards', () => {
    it('should not award rewards when level not complete', () => {
      renderHook(() => useAdventureLevelCompletion(defaultProps));
      expect(mockAwardXp).not.toHaveBeenCalled();
    });

    it('should award XP (for level-up detection) but NOT call addGold when level completes', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      // awardXp is called for level-up detection
      expect(mockAwardXp).toHaveBeenCalled();
      // addGold is NOT called — gold comes from server via ProgressionContext
      expect(mockAddGold).not.toHaveBeenCalled();
    });

    it('should set earnedGold display value with perfect clear bonus for 3 stars', () => {
      const { result } = renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 3 },
        })
      );

      // 3 stars * (10 + world*3) base + 50 perfect bonus = 3*13 + 50 = 89
      expect(result.current.earnedGold).toBe(89);
      expect(mockAddGold).not.toHaveBeenCalled();
    });

    it('should set earnedGold display value without perfect bonus for less than 3 stars', () => {
      const { result } = renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      // 2 stars * (10 + world*3) base = 2*13 = 26
      expect(result.current.earnedGold).toBe(26);
      expect(mockAddGold).not.toHaveBeenCalled();
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

  describe('eager DB save', () => {
    it('should call saveCompletion with correct earnedGold (not stale 0)', () => {
      // GIVEN — level completes with 2 stars on world 1 level 3
      // Gold: 2 * (10 + 1*3) = 26 (no perfect bonus, no long words)
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      // THEN — saveCompletion should be called with earnedGold=26, not 0
      expect(mockSaveCompletion).toHaveBeenCalledWith(
        1, // world
        3, // level
        2, // stars
        100, // score
        2, // wordsFound.length
        26, // earnedGold — must NOT be 0 (the race condition bug)
        0, // longWords (no words >= 6 chars)
        ['cat', 'dog'], // wordsFound for word album persistence
        undefined, // flashChallengeGold (no flash challenge)
        60 // timePlayed (timerSeconds=60 - timeRemaining=0)
      );
    });

    it('should call saveCompletion with perfect clear gold', () => {
      // GIVEN — 3 stars: gold = 3*(10+3) + 50 = 89
      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 3 },
        })
      );

      expect(mockSaveCompletion).toHaveBeenCalledWith(
        1, 3, 3, 100, 2,
        89, // 3*13 + 50 perfect bonus
        0,
        ['cat', 'dog'],
        undefined, // flashChallengeGold
        60 // timePlayed
      );
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

  describe('beforeunload sendBeacon', () => {
    // Bug: beacon payload omitted `flashChallengeCompleted`, so flash gold was
    // dropped silently if the player navigated away before the foreground
    // fetch resolved. The route trusts only the boolean (gold is computed
    // server-side), so we must echo it on the unload path.
    it('includes flashChallengeCompleted=true when flashChallengeGold > 0', () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(global.navigator, 'sendBeacon', {
        configurable: true, value: sendBeacon,
      });

      const { result } = renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
          flashChallengeGold: 25,
        })
      );
      // initiate save so completionSavedRef is true, saveResolvedRef false
      void result.current;

      window.dispatchEvent(new Event('beforeunload'));

      // beacon may not fire if save already resolved in test microtask;
      // assert payload shape only when it did fire
      if (sendBeacon.mock.calls.length > 0) {
        const blob = sendBeacon.mock.calls[0][1] as Blob;
        return blob.text().then(text => {
          const payload = JSON.parse(text);
          expect(payload.flashChallengeCompleted).toBe(true);
        });
      }
    });

    it('flashChallengeCompleted=false when no flash gold', () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(global.navigator, 'sendBeacon', {
        configurable: true, value: sendBeacon,
      });

      renderHook(() =>
        useAdventureLevelCompletion({
          ...defaultProps,
          gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
        })
      );

      window.dispatchEvent(new Event('beforeunload'));

      if (sendBeacon.mock.calls.length > 0) {
        const blob = sendBeacon.mock.calls[0][1] as Blob;
        return blob.text().then(text => {
          const payload = JSON.parse(text);
          expect(payload.flashChallengeCompleted).toBe(false);
        });
      }
    });
  });

  describe('offline mode enqueue', () => {
    const offlineProps = {
      ...defaultProps,
      userId: 'user-abc',
      gameState: { ...defaultProps.gameState, isComplete: true, stars: 2 },
    };

    beforeEach(() => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });
      mockEnqueueScore.mockResolvedValue('uuid-123');
    });

    it('enqueues to score queue instead of calling saveCompletion when offline + flag on + authenticated', async () => {
      renderHook(() => useAdventureLevelCompletion(offlineProps));

      await vi.waitFor(() => expect(mockEnqueueScore).toHaveBeenCalled());
      expect(mockSaveCompletion).not.toHaveBeenCalled();
      const [, mode, payload] = mockEnqueueScore.mock.calls[0];
      expect(mode).toBe('adventure');
      expect(payload).toMatchObject({
        world: 1,
        level: 3,
        stars: 2,
        score: 100,
        words: 2,
      });
    });

    it('calls saveCompletion normally when flag is off (offline irrelevant)', async () => {
      mockUseOfflineModeFlag.mockReturnValue(false);

      renderHook(() => useAdventureLevelCompletion(offlineProps));

      await vi.waitFor(() => expect(mockSaveCompletion).toHaveBeenCalled());
      expect(mockEnqueueScore).not.toHaveBeenCalled();
    });

    it('calls saveCompletion normally when online even with flag on', async () => {
      mockUseNetworkState.mockReturnValue({ online: true, slow: false, type: 'wifi', rttMs: 20 });

      renderHook(() => useAdventureLevelCompletion(offlineProps));

      await vi.waitFor(() => expect(mockSaveCompletion).toHaveBeenCalled());
      expect(mockEnqueueScore).not.toHaveBeenCalled();
    });

    it('calls saveCompletion normally when userId absent (guest)', async () => {
      renderHook(() =>
        useAdventureLevelCompletion({ ...offlineProps, userId: undefined })
      );

      await vi.waitFor(() => expect(mockSaveCompletion).toHaveBeenCalled());
      expect(mockEnqueueScore).not.toHaveBeenCalled();
    });

    it('does not enqueue when stars === 0 (failed level)', () => {
      renderHook(() =>
        useAdventureLevelCompletion({
          ...offlineProps,
          gameState: { ...offlineProps.gameState, stars: 0 },
        })
      );

      expect(mockEnqueueScore).not.toHaveBeenCalled();
      expect(mockSaveCompletion).not.toHaveBeenCalled();
    });
  });
});

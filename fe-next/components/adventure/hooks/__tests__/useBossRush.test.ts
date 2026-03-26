/**
 * useBossRush Tests
 *
 * Tests for the Boss Rush state machine hook that manages
 * sequential boss fights with shared player health.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBossRush } from '../useBossRush';
import type { LevelCompletion } from '@/types/adventure';

// Mock dependencies
vi.mock('@/lib/adventure/bossConfig', () => ({
  getBossConfig: vi.fn((worldId: number) => ({
    id: `boss-${worldId}`,
    worldId,
    displayName: `adventure.bosses.boss${worldId}.name`,
    personality: 'test',
    visualTheme: 'test',
    imagePath: `/images/bosses/boss-${worldId}.webp`,
    twistMechanic: { type: 'popQuiz', description: '', params: {} },
    taunts: { onStart: [], onGoodWord: [], onBadWord: [], onMechanic: [], onLowTime: [], onVictory: '', onDefeat: '' },
    phases: [],
  })),
}));

vi.mock('@/lib/adventure', () => ({
  getLevelConfig: vi.fn((worldId: number, level: number) => ({
    world: worldId,
    level,
    gridSize: 5,
    timerSeconds: 120,
    objectives: [{ type: 'defeatBoss', target: 1, isPrimary: true }],
    specialTiles: [],
    difficulty: 'HARD',
    chapterNumber: 3,
    levelInChapter: 3,
    isBossLevel: true,
    bossTwist: 'popQuiz',
    showBossIntro: true,
  })),
  generateAdventureGrid: vi.fn(() => [['A', 'B'], ['C', 'D']]),
  getLevelSeed: vi.fn((w: number, l: number) => w * 100 + l),
  getGridSize: vi.fn((w: number) => Math.min(4 + Math.floor(w / 3), 7)),
}));

// ==============================================
// HELPERS
// ==============================================

/** Create a completion for world W, level L */
function makeCompletion(world: number, level: number, stars: 1 | 2 | 3 = 3): LevelCompletion {
  return {
    world,
    level,
    stars,
    bestScore: 1000,
    bestWords: 10,
    completedAt: new Date().toISOString(),
  };
}

/** Completions with boss (level 7) of worlds 1 and 3 defeated */
function bossCompletions(...worlds: number[]): LevelCompletion[] {
  return worlds.map(w => makeCompletion(w, 7));
}

// ==============================================
// TESTS
// ==============================================

describe('useBossRush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------
  // canStartBossRush
  // ------------------------------------------

  describe('canStartBossRush', () => {
    it('is false with no completions', () => {
      const { result } = renderHook(() => useBossRush([]));
      expect(result.current.canStartBossRush).toBe(false);
    });

    it('is false when only non-boss levels are completed', () => {
      const completions = [makeCompletion(1, 1), makeCompletion(1, 3), makeCompletion(2, 5)];
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.canStartBossRush).toBe(false);
    });

    it('is true when level 7 of any world is completed', () => {
      const completions = [makeCompletion(1, 7)];
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.canStartBossRush).toBe(true);
    });

    it('is true with multiple boss completions', () => {
      const completions = bossCompletions(1, 3, 5);
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.canStartBossRush).toBe(true);
    });
  });

  // ------------------------------------------
  // defeatedBossWorlds
  // ------------------------------------------

  describe('defeatedBossWorlds', () => {
    it('returns empty array with no boss completions', () => {
      const { result } = renderHook(() => useBossRush([]));
      expect(result.current.defeatedBossWorlds).toEqual([]);
    });

    it('correctly extracts world IDs from completions', () => {
      const completions = [
        makeCompletion(1, 7),
        makeCompletion(2, 3), // not a boss level
        makeCompletion(3, 7),
        makeCompletion(5, 7),
      ];
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.defeatedBossWorlds).toEqual([1, 3, 5]);
    });

    it('returns sorted world IDs ascending', () => {
      const completions = [makeCompletion(5, 7), makeCompletion(1, 7), makeCompletion(3, 7)];
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.defeatedBossWorlds).toEqual([1, 3, 5]);
    });

    it('deduplicates multiple completions of same boss', () => {
      const completions = [makeCompletion(1, 7), makeCompletion(1, 7)];
      const { result } = renderHook(() => useBossRush(completions));
      expect(result.current.defeatedBossWorlds).toEqual([1]);
    });
  });

  // ------------------------------------------
  // startRush
  // ------------------------------------------

  describe('startRush', () => {
    it('initializes state correctly', () => {
      const completions = bossCompletions(1, 3);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.currentBossIndex).toBe(0);
      expect(result.current.state.totalBosses).toBe(2);
      expect(result.current.state.bossesDefeated).toBe(0);
      expect(result.current.state.totalScore).toBe(0);
      expect(result.current.state.isComplete).toBe(false);
      expect(result.current.state.isFailed).toBe(false);
      expect(result.current.state.startTime).toBeGreaterThan(0);
    });

    it('sets defeatedBosses from completions', () => {
      const completions = bossCompletions(2, 4);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });

      expect(result.current.state.defeatedBosses).toEqual([2, 4]);
    });
  });

  // ------------------------------------------
  // advanceToNextBoss
  // ------------------------------------------

  describe('advanceToNextBoss', () => {
    it('moves to next boss', () => {
      const completions = bossCompletions(1, 2, 3);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      act(() => { result.current.advanceToNextBoss(); });

      expect(result.current.state.currentBossIndex).toBe(1);
      expect(result.current.state.bossesDefeated).toBe(1);
      expect(result.current.state.isComplete).toBe(false);
    });

    it('sets isComplete on last boss', () => {
      const completions = bossCompletions(1, 2);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      // Beat boss 1
      act(() => { result.current.advanceToNextBoss(); });
      // Beat boss 2
      act(() => { result.current.advanceToNextBoss(); });

      expect(result.current.state.isComplete).toBe(true);
      expect(result.current.state.bossesDefeated).toBe(2);
    });

    it('does nothing when not active', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.advanceToNextBoss(); });

      expect(result.current.state.currentBossIndex).toBe(0);
    });
  });

  // ------------------------------------------
  // addScore
  // ------------------------------------------

  describe('addScore', () => {
    it('accumulates total score', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      act(() => { result.current.addScore(500); });
      act(() => { result.current.addScore(300); });

      expect(result.current.state.totalScore).toBe(800);
    });

    it('does nothing when not active', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.addScore(500); });

      expect(result.current.state.totalScore).toBe(0);
    });
  });

  // ------------------------------------------
  // failRush
  // ------------------------------------------

  describe('failRush', () => {
    it('sets isFailed', () => {
      const completions = bossCompletions(1, 2);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      act(() => { result.current.failRush(); });

      expect(result.current.state.isFailed).toBe(true);
      expect(result.current.state.isActive).toBe(false);
    });
  });

  // ------------------------------------------
  // resetRush
  // ------------------------------------------

  describe('resetRush', () => {
    it('clears all state', () => {
      const completions = bossCompletions(1, 2);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      act(() => { result.current.addScore(500); });
      act(() => { result.current.advanceToNextBoss(); });
      act(() => { result.current.resetRush(); });

      expect(result.current.state.isActive).toBe(false);
      expect(result.current.state.currentBossIndex).toBe(0);
      expect(result.current.state.totalScore).toBe(0);
      expect(result.current.state.bossesDefeated).toBe(0);
      expect(result.current.state.isComplete).toBe(false);
      expect(result.current.state.isFailed).toBe(false);
    });
  });

  // ------------------------------------------
  // getCurrentBossWorldId
  // ------------------------------------------

  describe('getCurrentBossWorldId', () => {
    it('returns correct world for current boss', () => {
      const completions = bossCompletions(2, 5, 8);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });

      expect(result.current.getCurrentBossWorldId()).toBe(2);

      act(() => { result.current.advanceToNextBoss(); });
      expect(result.current.getCurrentBossWorldId()).toBe(5);
    });

    it('returns null when not active', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      expect(result.current.getCurrentBossWorldId()).toBeNull();
    });
  });

  // ------------------------------------------
  // getCurrentBossConfig
  // ------------------------------------------

  describe('getCurrentBossConfig', () => {
    it('returns boss config for current boss', () => {
      const completions = bossCompletions(3);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });

      const config = result.current.getCurrentBossConfig();
      expect(config).not.toBeNull();
      expect(config!.worldId).toBe(3);
    });

    it('returns null when not active', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      expect(result.current.getCurrentBossConfig()).toBeNull();
    });
  });

  // ------------------------------------------
  // getLevelConfigForCurrentBoss
  // ------------------------------------------

  describe('getLevelConfigForCurrentBoss', () => {
    it('returns level config for current boss world', () => {
      const completions = bossCompletions(4);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });

      const config = result.current.getLevelConfigForCurrentBoss();
      expect(config).not.toBeNull();
      expect(config!.world).toBe(4);
      expect(config!.level).toBe(7);
      expect(config!.isBossLevel).toBe(true);
    });

    it('returns null when not active', () => {
      const { result } = renderHook(() => useBossRush([]));
      expect(result.current.getLevelConfigForCurrentBoss()).toBeNull();
    });
  });

  // ------------------------------------------
  // Single-boss rush (end-to-end)
  // ------------------------------------------

  describe('single-boss rush end-to-end', () => {
    it('completes rush with only 1 defeated boss', () => {
      const completions = bossCompletions(1);
      const { result } = renderHook(() => useBossRush(completions));

      // Start
      act(() => { result.current.startRush(); });
      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.totalBosses).toBe(1);
      expect(result.current.getCurrentBossWorldId()).toBe(1);

      // Score
      act(() => { result.current.addScore(1200); });

      // Beat the boss
      act(() => { result.current.advanceToNextBoss(); });

      expect(result.current.state.isComplete).toBe(true);
      expect(result.current.state.bossesDefeated).toBe(1);
      expect(result.current.state.totalScore).toBe(1200);
    });
  });

  // ------------------------------------------
  // Multi-boss rush (end-to-end)
  // ------------------------------------------

  describe('multi-boss rush end-to-end', () => {
    it('sequences through all bosses then completes', () => {
      const completions = bossCompletions(1, 3, 5);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      expect(result.current.state.totalBosses).toBe(3);

      // Boss 1 (world 1)
      expect(result.current.getCurrentBossWorldId()).toBe(1);
      act(() => { result.current.addScore(500); });
      act(() => { result.current.advanceToNextBoss(); });

      // Boss 2 (world 3)
      expect(result.current.getCurrentBossWorldId()).toBe(3);
      act(() => { result.current.addScore(700); });
      act(() => { result.current.advanceToNextBoss(); });

      // Boss 3 (world 5)
      expect(result.current.getCurrentBossWorldId()).toBe(5);
      act(() => { result.current.addScore(900); });
      act(() => { result.current.advanceToNextBoss(); });

      expect(result.current.state.isComplete).toBe(true);
      expect(result.current.state.bossesDefeated).toBe(3);
      expect(result.current.state.totalScore).toBe(2100);
    });

    it('can fail mid-rush', () => {
      const completions = bossCompletions(1, 2, 3);
      const { result } = renderHook(() => useBossRush(completions));

      act(() => { result.current.startRush(); });
      act(() => { result.current.advanceToNextBoss(); }); // beat boss 1
      act(() => { result.current.failRush(); }); // die on boss 2

      expect(result.current.state.isFailed).toBe(true);
      expect(result.current.state.bossesDefeated).toBe(1);
      expect(result.current.state.currentBossIndex).toBe(1);
    });
  });
});

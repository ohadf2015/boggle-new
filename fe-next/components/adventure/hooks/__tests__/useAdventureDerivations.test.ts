/**
 * useAdventureDerivations — bundled leaf derivations for AdventureGame.
 * Tests verify: bestAttempt/previousBestStars/streakMilestone/masteryAura/storyBeat lookups,
 * augmentedSkillEffects + forgeAugmentedBonuses multiplier composition,
 * lexiGameState coarse-time memoization,
 * getPopupStartPosition fallback + cell lookup.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAdventureDerivations } from '../useAdventureDerivations';

vi.mock('@/lib/adventure/powerGrowth', () => ({
  getMasteryAura: (level: number) => level * 2,
}));
vi.mock('@/lib/adventure/adventureStreak', () => ({
  getStreakMilestone: (streak: number) => (streak >= 3 ? { tier: 'gold' } : null),
}));
vi.mock('@/lib/adventure/storyConfig', () => ({
  getStoryBeat: (w: number, l: number) => (w === 1 && l === 1 ? { id: 'beat1' } : null),
}));

type Params = Parameters<typeof useAdventureDerivations>[0];

const makeParams = (overrides: Partial<Params> = {}): Params => ({
  init: {
    currentLevel: 5,
    skillEffects: { bossDamageMultiplier: 2 },
    runeEffects: { bossDamage: 3 },
    upgradeBonuses: { scoreBonus: 10 },
  } as never,
  forgeEffects: { bossDamage: 4, scoreMultiplier: 5 } as never,
  levelConfig: { world: 1, level: 1 } as never,
  progression: { streak: { currentStreak: 3 } } as never,
  getLevelAttempt: vi.fn(() => ({ attemptCount: 2, consecutiveFailures: 1 })),
  getLevelCompletion: vi.fn(() => ({ stars: 2 })),
  gameState: {
    wordsFound: ['CAT'], comboCount: 3, isComplete: false, stars: 0,
  } as never,
  timeRemaining: 20,
  selectedIndices: [],
  gridRef: { current: null },
  ...overrides,
});

describe('useAdventureDerivations', () => {
  it('derives bestAttempt, previousBestStars, streakMilestone, masteryAura, storyBeat', () => {
    const { result } = renderHook(() => useAdventureDerivations(makeParams()));
    expect(result.current.bestAttempt).toEqual({ attemptCount: 2, consecutiveFailures: 1 });
    expect(result.current.previousBestStars).toBe(2);
    expect(result.current.streakMilestone).toEqual({ tier: 'gold' });
    expect(result.current.masteryAura).toBe(10);
    expect(result.current.storyBeat).toEqual({ id: 'beat1' });
  });

  it('composes augmentedSkillEffects multiplicatively', () => {
    const { result } = renderHook(() => useAdventureDerivations(makeParams()));
    expect(result.current.augmentedSkillEffects.bossDamageMultiplier).toBe(2 * 3 * 4);
  });

  it('composes forgeAugmentedBonuses multiplicatively', () => {
    const { result } = renderHook(() => useAdventureDerivations(makeParams()));
    expect(result.current.forgeAugmentedBonuses.scoreBonus).toBe(10 * 5);
  });

  it('coarsens timeRemaining above 10s threshold', () => {
    const above = renderHook(() => useAdventureDerivations(makeParams({ timeRemaining: 42 })));
    expect(above.result.current.lexiGameState.timeRemaining).toBe(11);
    const below = renderHook(() => useAdventureDerivations(makeParams({ timeRemaining: 7 })));
    expect(below.result.current.lexiGameState.timeRemaining).toBe(7);
  });

  it('getPopupStartPosition falls back to window center when no selection', () => {
    const { result } = renderHook(() => useAdventureDerivations(makeParams()));
    const pos = result.current.getPopupStartPosition();
    expect(pos.x).toBe(window.innerWidth / 2);
    expect(pos.y).toBe(window.innerHeight / 2);
  });

  it('getPopupStartPosition reads last selected cell rect when available', () => {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.getBoundingClientRect = () => ({ left: 100, top: 200, width: 40, height: 60, right: 140, bottom: 260, x: 100, y: 200, toJSON: () => ({}) }) as DOMRect;
    const grid = document.createElement('div');
    grid.appendChild(cell);
    const { result } = renderHook(() => useAdventureDerivations(makeParams({
      selectedIndices: [0],
      gridRef: { current: grid },
    })));
    const pos = result.current.getPopupStartPosition();
    expect(pos.x).toBe(120);
    expect(pos.y).toBe(230);
  });
});

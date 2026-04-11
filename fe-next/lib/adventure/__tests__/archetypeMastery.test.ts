import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_MASTERY_THRESHOLDS,
  ARCHETYPE_MASTERY_BONUSES,
  getMasteryTier,
  calculateArchetypeMastery,
  getMasteryBonusesForArchetype,
  applyMasteryBonuses,
} from '../archetypeMastery';
import type {
  LevelCompletion,
  LevelConfig,
  ArchetypeMasteryTier,
  ArchetypeMasteryState,
  MasterableArchetype,
} from '@/types/adventure';

// ==============================================
// THRESHOLDS & CONSTANTS
// ==============================================

describe('ARCHETYPE_MASTERY_THRESHOLDS', () => {
  it('should have strictly increasing tier thresholds', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    expect(t.bronze).toBeGreaterThan(0);
    expect(t.silver).toBeGreaterThan(t.bronze);
    expect(t.gold).toBeGreaterThan(t.silver);
    expect(t.diamond).toBeGreaterThan(t.gold);
  });
});

describe('ARCHETYPE_MASTERY_BONUSES', () => {
  const masterableArchetypes: MasterableArchetype[] = [
    'classic', 'blast', 'hunt', 'wheel', 'forge',
  ];

  it('should define bonuses for every masterable archetype', () => {
    for (const arch of masterableArchetypes) {
      expect(ARCHETYPE_MASTERY_BONUSES[arch]).toBeDefined();
    }
  });

  it('should define bonuses for each non-none tier', () => {
    const tiers: ArchetypeMasteryTier[] = ['bronze', 'silver', 'gold', 'diamond'];
    for (const arch of masterableArchetypes) {
      for (const tier of tiers) {
        const bonus = ARCHETYPE_MASTERY_BONUSES[arch][tier];
        expect(bonus).toBeDefined();
        expect(bonus.value).toBeGreaterThan(0);
        expect(bonus.bonusType).toBeTruthy();
      }
    }
  });

  it('should NOT include boss archetype', () => {
    expect((ARCHETYPE_MASTERY_BONUSES as Record<string, unknown>)['boss']).toBeUndefined();
  });
});

// ==============================================
// getMasteryTier
// ==============================================

describe('getMasteryTier', () => {
  it('should return none for 0 stars', () => {
    expect(getMasteryTier(0)).toBe('none');
  });

  it('should return bronze once threshold is reached', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    expect(getMasteryTier(t.bronze)).toBe('bronze');
    expect(getMasteryTier(t.bronze - 1)).toBe('none');
  });

  it('should return silver once threshold is reached', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    expect(getMasteryTier(t.silver)).toBe('silver');
    expect(getMasteryTier(t.silver - 1)).toBe('bronze');
  });

  it('should return gold once threshold is reached', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    expect(getMasteryTier(t.gold)).toBe('gold');
  });

  it('should return diamond once threshold is reached', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    expect(getMasteryTier(t.diamond)).toBe('diamond');
    expect(getMasteryTier(t.diamond + 100)).toBe('diamond');
  });
});

// ==============================================
// calculateArchetypeMastery
// ==============================================

describe('calculateArchetypeMastery', () => {
  const makeCompletion = (world: number, level: number, stars: 0 | 1 | 2 | 3): LevelCompletion => ({
    world,
    level,
    stars,
    bestScore: 100,
    bestWords: 5,
    completedAt: '2026-01-01T00:00:00Z',
  });

  it('should return empty mastery map for no completions', () => {
    const result = calculateArchetypeMastery([]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should aggregate stars per archetype across completions', () => {
    // W1L1 is classic, W1L2 is classic — both contribute to classic mastery
    const completions = [
      makeCompletion(1, 1, 3),
      makeCompletion(1, 2, 2),
    ];
    const result = calculateArchetypeMastery(completions);
    // Both W1 levels are classic archetype, so total = 3 + 2 = 5
    expect(result['classic']).toBeDefined();
    expect(result['classic']!.totalStars).toBe(5);
  });

  it('should exclude boss levels from mastery calculation', () => {
    // Boss levels (level 7 in each world) should not appear
    const completions = [makeCompletion(1, 7, 3)];
    const result = calculateArchetypeMastery(completions);
    expect(result['boss' as MasterableArchetype]).toBeUndefined();
  });

  it('should compute correct tier based on accumulated stars', () => {
    const t = ARCHETYPE_MASTERY_THRESHOLDS;
    // Create enough completions to reach bronze for classic
    const completions: LevelCompletion[] = [];
    for (let i = 0; i < Math.ceil(t.bronze / 3); i++) {
      completions.push(makeCompletion(1, 1, 3));
    }
    const result = calculateArchetypeMastery(completions);
    expect(result['classic']!.tier).toBe('bronze');
  });

  it('should handle duplicate completions (replayed levels) by summing all stars', () => {
    // Same level completed twice — both count toward mastery
    const completions = [
      makeCompletion(1, 1, 3),
      makeCompletion(1, 1, 2),
    ];
    const result = calculateArchetypeMastery(completions);
    expect(result['classic']!.totalStars).toBe(5);
  });
});

// ==============================================
// getMasteryBonusesForArchetype
// ==============================================

describe('getMasteryBonusesForArchetype', () => {
  it('should return empty array for none tier', () => {
    const bonuses = getMasteryBonusesForArchetype('classic', 'none');
    expect(bonuses).toHaveLength(0);
  });

  it('should return cumulative bonuses up to current tier', () => {
    // Gold tier should include bronze + silver + gold bonuses
    const bonuses = getMasteryBonusesForArchetype('classic', 'gold');
    expect(bonuses).toHaveLength(3);
  });

  it('should return all 4 bonuses for diamond tier', () => {
    const bonuses = getMasteryBonusesForArchetype('blast', 'diamond');
    expect(bonuses).toHaveLength(4);
  });

  it('should return 1 bonus for bronze tier', () => {
    const bonuses = getMasteryBonusesForArchetype('forge', 'bronze');
    expect(bonuses).toHaveLength(1);
  });
});

// ==============================================
// applyMasteryBonuses
// ==============================================

describe('applyMasteryBonuses', () => {
  const baseLevelConfig: LevelConfig = {
    world: 3,
    level: 6, // forge archetype
    gridSize: 5,
    timerSeconds: 60,
    objectives: [
      { type: 'scoreTarget', target: 200, current: 0, isPrimary: true },
    ],
    specialTiles: [
      { type: 'gold', row: 0, col: 0 },
      { type: 'gold', row: 1, col: 1 },
    ],
    difficulty: 'MEDIUM',
    chapterNumber: 3,
    levelInChapter: 2,
    isBossLevel: false,
    archetype: 'forge',
  };

  it('should return config unchanged when mastery is undefined', () => {
    const result = applyMasteryBonuses(baseLevelConfig, undefined);
    expect(result).toEqual(baseLevelConfig);
  });

  it('should return config unchanged for boss levels', () => {
    const bossConfig: LevelConfig = {
      ...baseLevelConfig,
      level: 7,
      isBossLevel: true,
      archetype: 'boss',
    };
    const mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {
      forge: { totalStars: 50, tier: 'diamond' },
    };
    const result = applyMasteryBonuses(bossConfig, mastery);
    expect(result).toEqual(bossConfig);
  });

  it('should return config unchanged when archetype has no mastery', () => {
    const mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {
      classic: { totalStars: 10, tier: 'silver' },
    };
    // Config is forge but mastery only has classic
    const result = applyMasteryBonuses(baseLevelConfig, mastery);
    expect(result).toEqual(baseLevelConfig);
  });

  it('should add timer bonus seconds for timer-type bonuses (wheel bronze = +5s)', () => {
    const wheelConfig: LevelConfig = { ...baseLevelConfig, archetype: 'wheel' };
    const mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {
      wheel: { totalStars: 5, tier: 'bronze' },
    };
    const result = applyMasteryBonuses(wheelConfig, mastery);
    expect(result.timerSeconds).toBe(65); // 60 + 5
  });

  it('should accumulate multiple timer bonuses for higher tiers (wheel gold = bronze+silver+gold)', () => {
    // wheel bronze(+5s) + silver(tiles, no timer) + gold(+10s) = +15s
    const wheelConfig: LevelConfig = { ...baseLevelConfig, archetype: 'wheel' };
    const mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {
      wheel: { totalStars: 30, tier: 'gold' },
    };
    const result = applyMasteryBonuses(wheelConfig, mastery);
    expect(result.timerSeconds).toBe(75); // 60 + 5 + 10
  });

  it('should not mutate the original config', () => {
    const wheelConfig: LevelConfig = { ...baseLevelConfig, archetype: 'wheel' };
    const mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {
      wheel: { totalStars: 5, tier: 'bronze' },
    };
    const original = { ...wheelConfig };
    applyMasteryBonuses(wheelConfig, mastery);
    expect(wheelConfig).toEqual(original);
  });
});

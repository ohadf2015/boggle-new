import { describe, it, expect } from 'vitest';
import {
  COSMETICS,
  getUnlockedCosmetics,
  isUnlocked,
  getEquippedCosmetics,
  formatUnlockHint,
  formatUnlockProgress,
  diffNewlyUnlocked,
  type CosmeticCategory,
  type PlayerCosmeticState,
} from '../cosmetics';

const makePlayerState = (overrides?: Partial<PlayerCosmeticState>): PlayerCosmeticState => ({
  rankTier: 'Unranked',
  streakDays: 0,
  coins: 0,
  seasonRewards: [],
  purchasedIds: [],
  equippedIds: {},
  ...overrides,
});

describe('cosmetics registry', () => {
  it('has at least 16 cosmetics', () => {
    expect(COSMETICS.length).toBeGreaterThanOrEqual(16);
  });

  it('covers all 4 categories', () => {
    const categories = new Set(COSMETICS.map((c) => c.category));
    expect(categories).toEqual(
      new Set<CosmeticCategory>(['tileSkin', 'boardTheme', 'victoryEffect', 'profileFrame'])
    );
  });

  it('each cosmetic has required fields', () => {
    for (const c of COSMETICS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.rarity).toBeTruthy();
      expect(c.unlockCondition).toBeTruthy();
      expect(c.preview).toBeTruthy();
    }
  });
});

describe('isUnlocked', () => {
  it('returns true for default cosmetics', () => {
    const defaults = COSMETICS.filter((c) => c.unlockCondition.type === 'default');
    expect(defaults.length).toBeGreaterThan(0);
    const state = makePlayerState();
    for (const c of defaults) {
      expect(isUnlocked(c.id, state)).toBe(true);
    }
  });

  it('returns true for rank-based when player has sufficient rank', () => {
    const silverItem = COSMETICS.find(
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'Silver'
    );
    expect(silverItem).toBeDefined();
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'Silver' }))).toBe(true);
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'Gold' }))).toBe(true);
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'Bronze' }))).toBe(false);
  });

  it('returns true for streak-based when player has enough days', () => {
    const streakItem = COSMETICS.find(
      (c) => c.unlockCondition.type === 'streak' && c.unlockCondition.days === 7
    );
    expect(streakItem).toBeDefined();
    expect(isUnlocked(streakItem!.id, makePlayerState({ streakDays: 7 }))).toBe(true);
    expect(isUnlocked(streakItem!.id, makePlayerState({ streakDays: 10 }))).toBe(true);
    expect(isUnlocked(streakItem!.id, makePlayerState({ streakDays: 6 }))).toBe(false);
  });

  it('returns true for purchased cosmetics', () => {
    const purchaseItem = COSMETICS.find((c) => c.unlockCondition.type === 'purchase');
    expect(purchaseItem).toBeDefined();
    expect(isUnlocked(purchaseItem!.id, makePlayerState({ purchasedIds: [purchaseItem!.id] }))).toBe(true);
    expect(isUnlocked(purchaseItem!.id, makePlayerState({ purchasedIds: [] }))).toBe(false);
  });

  it('returns false for unknown cosmetic id', () => {
    expect(isUnlocked('nonexistent', makePlayerState())).toBe(false);
  });
});

describe('getUnlockedCosmetics', () => {
  it('returns only defaults for new player', () => {
    const unlocked = getUnlockedCosmetics(makePlayerState());
    const defaults = COSMETICS.filter((c) => c.unlockCondition.type === 'default');
    expect(unlocked).toEqual(defaults);
  });

  it('includes rank-unlocked items for ranked player', () => {
    const unlocked = getUnlockedCosmetics(makePlayerState({ rankTier: 'Gold' }));
    const goldItem = COSMETICS.find(
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'Gold'
    );
    expect(unlocked).toContainEqual(goldItem);
  });
});

describe('formatUnlockHint', () => {
  it('returns null for default cosmetics (no hint needed)', () => {
    const def = COSMETICS.find((c) => c.unlockCondition.type === 'default')!;
    expect(formatUnlockHint(def)).toBeNull();
  });

  it('returns rank hint with tier param', () => {
    const rank = COSMETICS.find(
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'Silver',
    )!;
    expect(formatUnlockHint(rank)).toEqual({
      key: 'cosmetics.unlock.rank',
      params: { tier: 'Silver' },
    });
  });

  it('returns streak hint with days param', () => {
    const streak = COSMETICS.find((c) => c.unlockCondition.type === 'streak')!;
    expect(formatUnlockHint(streak)).toEqual({
      key: 'cosmetics.unlock.streak',
      params: { days: (streak.unlockCondition as { days: number }).days },
    });
  });

  it('returns purchase hint with cost param', () => {
    const buy = COSMETICS.find((c) => c.unlockCondition.type === 'purchase')!;
    expect(formatUnlockHint(buy)).toEqual({
      key: 'cosmetics.unlock.purchase',
      params: { cost: (buy.unlockCondition as { cost: number }).cost },
    });
  });
});

describe('diffNewlyUnlocked', () => {
  it('returns cosmetics newly unlocked between two states', () => {
    const before = { rankTier: 'Bronze', streakDays: 0, coins: 0, seasonRewards: [], purchasedIds: [], equippedIds: {} };
    const after = { ...before, rankTier: 'Silver' };
    const newly = diffNewlyUnlocked(before, after);
    expect(newly.some((c) => c.id === 'tile-neon')).toBe(true);
    expect(newly.some((c) => c.id === 'frame-silver')).toBe(true);
    expect(newly.some((c) => c.id === 'tile-default')).toBe(false);
  });

  it('returns empty when nothing changed', () => {
    const state = makePlayerState({ rankTier: 'Gold' });
    expect(diffNewlyUnlocked(state, state)).toEqual([]);
  });
});

describe('getEquippedCosmetics', () => {
  it('returns equipped items per category', () => {
    const defaultTile = COSMETICS.find(
      (c) => c.category === 'tileSkin' && c.unlockCondition.type === 'default'
    );
    const state = makePlayerState({
      equippedIds: { tileSkin: defaultTile!.id },
    });
    const equipped = getEquippedCosmetics(state);
    expect(equipped.tileSkin).toEqual(defaultTile);
  });

  it('returns undefined for unequipped categories', () => {
    const equipped = getEquippedCosmetics(makePlayerState());
    expect(equipped.tileSkin).toBeUndefined();
  });
});

describe('formatUnlockProgress', () => {
  const streakItem = COSMETICS.find((c) => c.unlockCondition.type === 'streak')!;
  const rankItem = COSMETICS.find((c) => c.unlockCondition.type === 'rank')!;
  const purchaseItem = COSMETICS.find((c) => c.unlockCondition.type === 'purchase')!;
  const defaultItem = COSMETICS.find((c) => c.unlockCondition.type === 'default')!;

  it('reports streak progress with current clamped to the target', () => {
    const target = (streakItem.unlockCondition as { days: number }).days;
    const progress = formatUnlockProgress(streakItem, { rankTier: 'Bronze', streakDays: 3 });
    expect(progress).toEqual({
      key: 'cosmetics.progress.streak',
      params: { current: 3, target },
    });
  });

  it('does not let streak current exceed the target', () => {
    const target = (streakItem.unlockCondition as { days: number }).days;
    const progress = formatUnlockProgress(streakItem, { rankTier: 'Bronze', streakDays: target + 99 });
    expect(progress?.params).toEqual({ current: target, target });
  });

  it('reports rank progress as current → required tier', () => {
    const tier = (rankItem.unlockCondition as { tier: string }).tier;
    const progress = formatUnlockProgress(rankItem, { rankTier: 'Bronze', streakDays: 0 });
    expect(progress).toEqual({
      key: 'cosmetics.progress.rank',
      params: { current: 'Bronze', tier },
    });
  });

  it('returns null for purchase and default items (no grind progress to show)', () => {
    expect(formatUnlockProgress(purchaseItem, { rankTier: 'Bronze', streakDays: 0 })).toBeNull();
    expect(formatUnlockProgress(defaultItem, { rankTier: 'Bronze', streakDays: 0 })).toBeNull();
  });
});

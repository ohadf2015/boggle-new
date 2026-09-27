import { describe, it, expect } from 'vitest';
import {
  COSMETICS,
  getUnlockedCosmetics,
  isUnlocked,
  getEquippedCosmetics,
  formatUnlockHint,
  formatUnlockProgress,
  localizeTierParams,
  cosmeticsUnlockedAtTier,
  diffNewlyUnlocked,
  type CosmeticCategory,
  type PlayerCosmeticState,
} from '../cosmetics';
import { getGlobalLeaderboardTier } from '../ranked/leaderboardTiers';

// Player tiers are the lowercase leaderboard tier ids derived from total_score
// (stone|bronze|silver|gold|platinum|diamond|grandmaster) — the values that
// actually flow in at runtime. Tests use these, not capitalized strings.
const makePlayerState = (overrides?: Partial<PlayerCosmeticState>): PlayerCosmeticState => ({
  rankTier: 'stone',
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

  it('every rank requirement is a real lowercase leaderboard tier id (no phantom "Master")', () => {
    const validTiers = new Set([
      'stone', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster',
    ]);
    for (const c of COSMETICS) {
      if (c.unlockCondition.type === 'rank') {
        expect(validTiers.has(c.unlockCondition.tier)).toBe(true);
      }
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
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'silver'
    );
    expect(silverItem).toBeDefined();
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'silver' }))).toBe(true);
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'gold' }))).toBe(true);
    expect(isUnlocked(silverItem!.id, makePlayerState({ rankTier: 'bronze' }))).toBe(false);
  });

  it('is case-insensitive on the player tier (defensive against legacy capitalized values)', () => {
    const silverItem = COSMETICS.find(
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'silver'
    )!;
    expect(isUnlocked(silverItem.id, makePlayerState({ rankTier: 'Silver' }))).toBe(true);
    expect(isUnlocked(silverItem.id, makePlayerState({ rankTier: 'GOLD' }))).toBe(true);
  });

  it('REGRESSION: a player who earned a tier (via total_score) unlocks that tier\'s cosmetics', () => {
    // This is the path that was broken: total_score -> tier id -> unlock gate.
    // Silver tier starts at 2500 total_score.
    const silverTierId = getGlobalLeaderboardTier(2500).id; // 'silver'
    const neon = COSMETICS.find((c) => c.id === 'tile-neon')!;
    expect(neon.unlockCondition).toMatchObject({ type: 'rank', tier: 'silver' });
    expect(isUnlocked('tile-neon', makePlayerState({ rankTier: silverTierId }))).toBe(true);

    // Just below Silver (2499 -> bronze) stays locked.
    const bronzeTierId = getGlobalLeaderboardTier(2499).id; // 'bronze'
    expect(isUnlocked('tile-neon', makePlayerState({ rankTier: bronzeTierId }))).toBe(false);
  });

  it('grandmaster unlocks the legendary fire tiles (formerly the phantom "Master" tier)', () => {
    const gmTier = getGlobalLeaderboardTier(200000).id; // 'grandmaster'
    expect(isUnlocked('tile-fire', makePlayerState({ rankTier: gmTier }))).toBe(true);
    expect(isUnlocked('tile-fire', makePlayerState({ rankTier: 'diamond' }))).toBe(false);
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
    const unlocked = getUnlockedCosmetics(makePlayerState({ rankTier: 'gold' }));
    const goldItem = COSMETICS.find(
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'gold'
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
      (c) => c.unlockCondition.type === 'rank' && c.unlockCondition.tier === 'silver',
    )!;
    expect(formatUnlockHint(rank)).toEqual({
      key: 'cosmetics.unlock.rank',
      params: { tier: 'silver' },
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

describe('cosmeticsUnlockedAtTier', () => {
  it('returns the rank-gated cosmetics earned at a tier', () => {
    const silver = cosmeticsUnlockedAtTier('silver').map((c) => c.id);
    expect(silver).toContain('tile-neon');
    expect(silver).toContain('frame-silver');
    // Not other tiers
    expect(silver).not.toContain('tile-crystal'); // diamond
  });

  it('is case-insensitive', () => {
    expect(cosmeticsUnlockedAtTier('GOLD').map((c) => c.id)).toEqual(
      cosmeticsUnlockedAtTier('gold').map((c) => c.id),
    );
  });

  it('returns empty for a tier with no rank cosmetics (e.g. stone)', () => {
    expect(cosmeticsUnlockedAtTier('stone')).toEqual([]);
  });

  it('grandmaster yields the legendary fire tiles', () => {
    expect(cosmeticsUnlockedAtTier('grandmaster').map((c) => c.id)).toContain('tile-fire');
  });
});

describe('localizeTierParams', () => {
  const fakeT = (key: string) => `T(${key})`;

  it('translates tier-id string params to localized names', () => {
    expect(localizeTierParams({ tier: 'silver' }, fakeT)).toEqual({ tier: 'T(rank.tier.silver)' });
  });

  it('translates both current and target tier ids in rank progress', () => {
    expect(localizeTierParams({ current: 'bronze', tier: 'silver' }, fakeT)).toEqual({
      current: 'T(rank.tier.bronze)',
      tier: 'T(rank.tier.silver)',
    });
  });

  it('leaves numeric params (streak days / cost) untouched', () => {
    expect(localizeTierParams({ current: 3, target: 7 }, fakeT)).toEqual({ current: 3, target: 7 });
    expect(localizeTierParams({ cost: 100 }, fakeT)).toEqual({ cost: 100 });
  });

  it('is case-insensitive and returns undefined passthrough', () => {
    expect(localizeTierParams({ tier: 'GOLD' }, fakeT)).toEqual({ tier: 'T(rank.tier.gold)' });
    expect(localizeTierParams(undefined, fakeT)).toBeUndefined();
  });
});

describe('diffNewlyUnlocked', () => {
  it('returns cosmetics newly unlocked between two states', () => {
    const before = makePlayerState({ rankTier: 'bronze' });
    const after = { ...before, rankTier: 'silver' };
    const newly = diffNewlyUnlocked(before, after);
    expect(newly.some((c) => c.id === 'tile-neon')).toBe(true);
    expect(newly.some((c) => c.id === 'frame-silver')).toBe(true);
    expect(newly.some((c) => c.id === 'tile-default')).toBe(false);
  });

  it('returns empty when nothing changed', () => {
    const state = makePlayerState({ rankTier: 'gold' });
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
    const progress = formatUnlockProgress(streakItem, { rankTier: 'bronze', streakDays: 3 });
    expect(progress).toEqual({
      key: 'cosmetics.progress.streak',
      params: { current: 3, target },
    });
  });

  it('does not let streak current exceed the target', () => {
    const target = (streakItem.unlockCondition as { days: number }).days;
    const progress = formatUnlockProgress(streakItem, { rankTier: 'bronze', streakDays: target + 99 });
    expect(progress?.params).toEqual({ current: target, target });
  });

  it('reports rank progress as current → required tier', () => {
    const tier = (rankItem.unlockCondition as { tier: string }).tier;
    const progress = formatUnlockProgress(rankItem, { rankTier: 'bronze', streakDays: 0 });
    expect(progress).toEqual({
      key: 'cosmetics.progress.rank',
      params: { current: 'bronze', tier },
    });
  });

  it('returns null for purchase and default items (no grind progress to show)', () => {
    expect(formatUnlockProgress(purchaseItem, { rankTier: 'bronze', streakDays: 0 })).toBeNull();
    expect(formatUnlockProgress(defaultItem, { rankTier: 'bronze', streakDays: 0 })).toBeNull();
  });
});

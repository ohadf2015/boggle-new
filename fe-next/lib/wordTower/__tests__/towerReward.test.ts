import { describe, it, expect } from 'vitest';
import {
  rollTowerReward,
  nextDryStreak,
  rewardRoll01,
  rewardDedupeKey,
  REWARD_PITY_THRESHOLD,
  type TowerRewardContext,
} from '../towerReward';

const ctx = (over: Partial<TowerRewardContext> = {}): TowerRewardContext => ({
  source: 'zone',
  magnitude: 1,
  dryStreak: 0,
  ...over,
});

describe('rollTowerReward — tiers', () => {
  it('returns epic for a very low roll', () => {
    expect(rollTowerReward(0.01, ctx()).tier).toBe('epic');
  });
  it('returns rare for a low-mid roll', () => {
    expect(rollTowerReward(0.08, ctx()).tier).toBe('rare');
  });
  it('returns uncommon for a mid roll', () => {
    expect(rollTowerReward(0.2, ctx()).tier).toBe('uncommon');
  });
  it('returns common for a high roll', () => {
    expect(rollTowerReward(0.9, ctx()).tier).toBe('common');
  });
});

describe('rollTowerReward — always grants real coins', () => {
  it('grants > 0 coins for every source even on a common roll', () => {
    for (const source of ['zone', 'achievement', 'pbMilestone', 'surprise'] as const) {
      const r = rollTowerReward(0.95, ctx({ source }));
      expect(r.coins).toBeGreaterThan(0);
    }
  });
  it('higher tier grants more coins than common for the same source', () => {
    const common = rollTowerReward(0.95, ctx()).coins;
    const epic = rollTowerReward(0.01, ctx()).coins;
    expect(epic).toBeGreaterThan(common);
  });
  it('zone coins scale up with magnitude (zone index)', () => {
    const low = rollTowerReward(0.95, ctx({ magnitude: 0 })).coins;
    const high = rollTowerReward(0.95, ctx({ magnitude: 5 })).coins;
    expect(high).toBeGreaterThan(low);
  });
});

describe('rollTowerReward — pity', () => {
  it('forces at least uncommon once dryStreak hits the pity threshold', () => {
    const r = rollTowerReward(0.95, ctx({ dryStreak: REWARD_PITY_THRESHOLD }));
    expect(r.tier).not.toBe('common');
  });
  it('does not downgrade a naturally-high tier under pity', () => {
    const r = rollTowerReward(0.01, ctx({ dryStreak: REWARD_PITY_THRESHOLD }));
    expect(r.tier).toBe('epic');
  });
});

describe('nextDryStreak', () => {
  it('increments on a common', () => {
    expect(nextDryStreak(3, 'common')).toBe(4);
  });
  it('resets on any non-common', () => {
    expect(nextDryStreak(3, 'uncommon')).toBe(0);
    expect(nextDryStreak(7, 'epic')).toBe(0);
  });
});

describe('rewardRoll01 — deterministic seeded roll', () => {
  it('is stable for the same seed string', () => {
    expect(rewardRoll01('abc')).toBe(rewardRoll01('abc'));
  });
  it('is in [0,1)', () => {
    for (const s of ['a', 'b', 'zone-3', 'run-XYZ-pb-100']) {
      const v = rewardRoll01(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('differs across distinct seeds', () => {
    expect(rewardRoll01('zone-1')).not.toBe(rewardRoll01('zone-2'));
  });
});

describe('rewardDedupeKey', () => {
  it('is stable and unique per (player, source, id)', () => {
    const a = rewardDedupeKey('p1', 'zone', 'sky');
    expect(a).toBe(rewardDedupeKey('p1', 'zone', 'sky'));
    expect(a).not.toBe(rewardDedupeKey('p1', 'zone', 'orbit'));
    expect(a).not.toBe(rewardDedupeKey('p2', 'zone', 'sky'));
  });
});

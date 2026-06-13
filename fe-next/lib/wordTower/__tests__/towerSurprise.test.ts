import { describe, it, expect } from 'vitest';
import {
  TOWER_SURPRISE_UNLOCK_FLOOR,
  TOWER_SURPRISE_COOLDOWN,
  TOWER_SURPRISE_PITY,
  towerSurpriseChance,
  pickTowerSurprise,
  rollTowerSurprise,
  towerSurpriseReward,
  resolveTowerSubmitSurprise,
  initialTowerSurpriseSeed,
  advanceTowerSeed,
  towerSeedUnit,
  TOWER_SURPRISE_META,
  type TowerSurpriseEvent,
  type TowerSurpriseState,
} from '../towerSurprise';

const baseCtx = { floorCount: 10, wordsSinceLast: 4, wordLen: 5, combo: 3, baseMeters: 10 };

describe('towerSurpriseChance', () => {
  it('is zero before the unlock floor (FTUE protected)', () => {
    expect(towerSurpriseChance({ ...baseCtx, floorCount: TOWER_SURPRISE_UNLOCK_FLOOR - 1 })).toBe(0);
  });

  it('is zero within the cooldown window (no back-to-back pops)', () => {
    expect(towerSurpriseChance({ ...baseCtx, wordsSinceLast: TOWER_SURPRISE_COOLDOWN - 1 })).toBe(0);
  });

  it('is a guaranteed 1 once the pity window is reached (no dead loop)', () => {
    expect(towerSurpriseChance({ ...baseCtx, wordsSinceLast: TOWER_SURPRISE_PITY })).toBe(1);
  });

  it('sits between 0 and 1 in the normal window', () => {
    const c = towerSurpriseChance({ ...baseCtx, wordsSinceLast: TOWER_SURPRISE_COOLDOWN });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });

  it('rewards longer words and higher combos with a higher chance', () => {
    const low = towerSurpriseChance({ ...baseCtx, wordsSinceLast: TOWER_SURPRISE_COOLDOWN, wordLen: 3, combo: 0 });
    const high = towerSurpriseChance({ ...baseCtx, wordsSinceLast: TOWER_SURPRISE_COOLDOWN, wordLen: 8, combo: 10 });
    expect(high).toBeGreaterThan(low);
  });
});

describe('pickTowerSurprise', () => {
  it('maps roll 0 to the first weighted event and ~1 to the last', () => {
    expect(pickTowerSurprise(0)).toBe('surge');
    expect(pickTowerSurprise(0.999)).toBe('golden_floor');
  });

  it('only ever returns known events', () => {
    const known: TowerSurpriseEvent[] = ['surge', 'windfall', 'updraft', 'crystal', 'golden_floor'];
    for (let i = 0; i < 50; i++) {
      expect(known).toContain(pickTowerSurprise(i / 50));
    }
  });
});

describe('rollTowerSurprise', () => {
  it('returns null when chance is zero (locked / cooldown)', () => {
    const rng = () => 0; // would always fire if allowed
    expect(rollTowerSurprise(rng, { ...baseCtx, floorCount: 0 })).toBeNull();
  });

  it('fires on the pity word regardless of the roll', () => {
    const rng = () => 0.99; // high roll, would miss a probabilistic gate
    expect(rollTowerSurprise(rng, { ...baseCtx, wordsSinceLast: TOWER_SURPRISE_PITY })).not.toBeNull();
  });
});

describe('towerSurpriseReward', () => {
  it('surge grants bonus meters proportional to base, no scrambles', () => {
    const r = towerSurpriseReward('surge', baseCtx);
    expect(r.bonusMeters).toBeGreaterThan(0);
    expect(r.bonusScrambles).toBe(0);
    expect(r.nextWordHeightMult).toBe(1);
  });

  it('windfall grants scrambles, no immediate meters', () => {
    const r = towerSurpriseReward('windfall', baseCtx);
    expect(r.bonusScrambles).toBeGreaterThan(0);
    expect(r.bonusMeters).toBe(0);
  });

  it('updraft charges the next word, not this one', () => {
    const r = towerSurpriseReward('updraft', baseCtx);
    expect(r.nextWordHeightMult).toBeGreaterThan(1);
    expect(r.bonusMeters).toBe(0);
  });

  it('golden_floor is the biggest payout (meters + a scramble)', () => {
    const golden = towerSurpriseReward('golden_floor', baseCtx);
    const surge = towerSurpriseReward('surge', baseCtx);
    expect(golden.bonusMeters).toBeGreaterThan(surge.bonusMeters);
    expect(golden.bonusScrambles).toBeGreaterThan(0);
  });

  it('scales meter payouts with the base scoring (deeper = bigger)', () => {
    const shallow = towerSurpriseReward('surge', { ...baseCtx, baseMeters: 10 });
    const deep = towerSurpriseReward('surge', { ...baseCtx, baseMeters: 40 });
    expect(deep.bonusMeters).toBeGreaterThan(shallow.bonusMeters);
  });
});

describe('resolveTowerSubmitSurprise (reducer-facing)', () => {
  const seed = initialTowerSurpriseSeed('DAILY-2026-06-13');
  const freshState: TowerSurpriseState = {
    surpriseSeed: seed,
    wordsSinceSurprise: 0,
    nextWordHeightMult: 1,
    activeSurprise: null,
  };

  it('is deterministic — identical input yields identical output (leaderboard integrity)', () => {
    const input = { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 };
    const a = resolveTowerSubmitSurprise(freshState, input);
    const b = resolveTowerSubmitSurprise(freshState, input);
    expect(a).toEqual(b);
  });

  it('advances the seed on a roll-eligible word so consecutive rolls diverge', () => {
    const input = { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 };
    // Prime past the cooldown so a real roll (and a seed draw) happens. During
    // cooldown the roll short-circuits before drawing — that is intended, the
    // seed only advances when entropy is actually consumed.
    const eligible: TowerSurpriseState = { ...freshState, wordsSinceSurprise: TOWER_SURPRISE_COOLDOWN };
    const first = resolveTowerSubmitSurprise(eligible, input);
    expect(first.next.surpriseSeed).not.toBe(eligible.surpriseSeed);
  });

  it('never fires before the unlock floor', () => {
    const input = { floorCount: 0, wordLen: 6, combo: 4, baseMeters: 14 };
    const out = resolveTowerSubmitSurprise(
      { ...freshState, wordsSinceSurprise: TOWER_SURPRISE_PITY + 2 },
      input,
    );
    expect(out.next.activeSurprise).toBeNull();
    expect(out.bonusMeters).toBe(0);
  });

  it('guarantees a fire by the pity word and resets the counter', () => {
    const input = { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 };
    const primed: TowerSurpriseState = { ...freshState, wordsSinceSurprise: TOWER_SURPRISE_PITY - 1 };
    const out = resolveTowerSubmitSurprise(primed, input);
    expect(out.next.activeSurprise).not.toBeNull();
    expect(out.next.wordsSinceSurprise).toBe(0);
  });

  it('consumes a banked updraft multiplier on the FOLLOWING word', () => {
    const input = { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 };
    const charged: TowerSurpriseState = { ...freshState, nextWordHeightMult: 1.5, wordsSinceSurprise: 0 };
    const out = resolveTowerSubmitSurprise(charged, input);
    expect(out.appliedHeightMult).toBe(1.5);
    // the charge is spent — not silently re-applied next word unless re-rolled
    expect(out.next.nextWordHeightMult === 1 || out.next.activeSurprise?.event === 'updraft').toBe(true);
  });

  it('bumps the active-surprise key on every fire so the HUD re-animates repeats', () => {
    const input = { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 };
    const primed: TowerSurpriseState = { ...freshState, wordsSinceSurprise: TOWER_SURPRISE_PITY };
    const out1 = resolveTowerSubmitSurprise(primed, input);
    const out2 = resolveTowerSubmitSurprise(
      { ...out1.next, wordsSinceSurprise: TOWER_SURPRISE_PITY },
      input,
    );
    expect(out2.next.activeSurprise!.key).toBeGreaterThan(out1.next.activeSurprise!.key);
  });
});

describe('seed helpers', () => {
  it('initialTowerSurpriseSeed is stable per gameCode and never zero', () => {
    expect(initialTowerSurpriseSeed('X')).toBe(initialTowerSurpriseSeed('X'));
    expect(initialTowerSurpriseSeed('X')).not.toBe(0);
  });

  it('advanceTowerSeed + towerSeedUnit produce values in [0,1)', () => {
    let s = initialTowerSurpriseSeed('seed');
    for (let i = 0; i < 20; i++) {
      s = advanceTowerSeed(s);
      const u = towerSeedUnit(s);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});

describe('TOWER_SURPRISE_META', () => {
  it('has display + audio metadata (emoji + i18n key + sound) for every event', () => {
    const events: TowerSurpriseEvent[] = ['surge', 'windfall', 'updraft', 'crystal', 'golden_floor'];
    const validSounds = ['powerUp', 'gift', 'timeBonus', 'rare', 'chest'];
    for (const e of events) {
      expect(TOWER_SURPRISE_META[e].emoji).toBeTruthy();
      expect(TOWER_SURPRISE_META[e].key).toBeTruthy();
      expect(validSounds).toContain(TOWER_SURPRISE_META[e].sound);
    }
  });
});

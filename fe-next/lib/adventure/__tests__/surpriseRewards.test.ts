/**
 * Tests for the variable-reward "surprise" system.
 * Each level may roll an UNEXPECTED bonus event — deterministic per level (so a
 * level feels distinct, not random noise) but varied across levels (so the game
 * isn't "the same level over and over"). Probability + magnitude rise by world.
 * Purely additive: surprises only ever GRANT extra, never reduce.
 */

import {
  rollLevelSurprise,
  SURPRISE_KINDS,
  surpriseChance,
  type LevelSurprise,
} from '../surpriseRewards';

describe('surpriseChance', () => {
  it('rises with world depth (more variety / stakes later)', () => {
    expect(surpriseChance(10)).toBeGreaterThan(surpriseChance(1));
  });
  it('stays a valid probability', () => {
    for (let w = 1; w <= 10; w++) {
      const c = surpriseChance(w);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe('rollLevelSurprise', () => {
  it('is deterministic for the same world+level', () => {
    const a = rollLevelSurprise(3, 4);
    const b = rollLevelSurprise(3, 4);
    expect(a).toEqual(b);
  });

  it('varies across levels (not the same every time)', () => {
    const results = new Set<string>();
    for (let lvl = 1; lvl <= 7; lvl++) {
      const s = rollLevelSurprise(8, lvl);
      results.add(s ? s.kind : 'none');
    }
    // Across a world's 7 levels we expect more than one distinct outcome.
    expect(results.size).toBeGreaterThan(1);
  });

  it('returns null or a well-formed surprise', () => {
    for (let w = 1; w <= 10; w++) {
      for (let lvl = 1; lvl <= 7; lvl++) {
        const s = rollLevelSurprise(w, lvl);
        if (s === null) continue;
        expect(SURPRISE_KINDS).toContain(s.kind);
        expect(s.magnitude).toBeGreaterThan(0);
        expect(s.labelKey).toMatch(/^adventure\.surprise\./);
        expect(s.descKey).toMatch(/^adventure\.surprise\./);
      }
    }
  });

  it('scales magnitude up with world for gold-type surprises', () => {
    // Find a gold surprise in an early and a late world for the same relative level.
    const collectGold = (world: number): LevelSurprise | null => {
      for (let lvl = 1; lvl <= 7; lvl++) {
        const s = rollLevelSurprise(world, lvl);
        if (s && s.kind === 'doubleGold') return s;
      }
      return null;
    };
    const early = collectGold(1);
    const late = collectGold(10);
    if (early && late) {
      expect(late.magnitude).toBeGreaterThanOrEqual(early.magnitude);
    }
  });

  it('produces at least some surprises across a full campaign', () => {
    let count = 0;
    for (let w = 1; w <= 10; w++) {
      for (let lvl = 1; lvl <= 7; lvl++) {
        if (rollLevelSurprise(w, lvl)) count++;
      }
    }
    expect(count).toBeGreaterThan(5);
  });
});

describe('applySurpriseToGold', () => {
  it('only ever increases gold (additive, never punishing)', async () => {
    const { applySurpriseToGold } = await import('../surpriseRewards');
    const base = 100;
    for (let w = 1; w <= 10; w++) {
      for (let lvl = 1; lvl <= 7; lvl++) {
        const s = rollLevelSurprise(w, lvl);
        const out = applySurpriseToGold(base, s);
        expect(out).toBeGreaterThanOrEqual(base);
      }
    }
  });

  it('doubles gold for a doubleGold surprise', async () => {
    const { applySurpriseToGold } = await import('../surpriseRewards');
    const s: LevelSurprise = { kind: 'doubleGold', magnitude: 2, labelKey: 'adventure.surprise.doubleGold.label', descKey: 'adventure.surprise.doubleGold.desc' };
    expect(applySurpriseToGold(100, s)).toBe(200);
  });
});

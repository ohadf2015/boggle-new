/**
 * Word Tower — upgrade catalog (TDD): shop categories, current→next effect
 * previews, and the "best pick" recommendation. Presentation-layer math only —
 * costs and effects stay in upgrades.ts untouched.
 */
import { describe, it, expect } from 'vitest';
import { UPGRADE_CATEGORIES, effectDelta, recommendedUpgrade } from '../upgradeCatalog';
import { UPGRADE_IDS, UPGRADE_DEFS } from '../upgrades';

const ALL = UPGRADE_CATEGORIES.flatMap((c) => c.upgrades);

describe('UPGRADE_CATEGORIES', () => {
  it('covers every upgrade exactly once', () => {
    expect(ALL).toHaveLength(UPGRADE_IDS.length);
    expect(new Set(ALL).size).toBe(UPGRADE_IDS.length);
    for (const id of UPGRADE_IDS) expect(ALL).toContain(id);
  });

  it('has the 3 expected categories, crane first', () => {
    expect(UPGRADE_CATEGORIES.map((c) => c.id)).toEqual(['crane', 'stability', 'boost']);
    expect(UPGRADE_CATEGORIES[0].upgrades).toContain('steadyCable');
  });
});

describe('effectDelta', () => {
  it('returns distinct current and next strings at level 0 for every upgrade', () => {
    for (const id of UPGRADE_IDS) {
      const d = effectDelta(id, 0);
      expect(d).not.toBeNull();
      expect(d!.current).toBeTruthy();
      expect(d!.next).toBeTruthy();
      expect(d!.next).not.toBe(d!.current);
    }
  });

  it('returns null at max level', () => {
    for (const id of UPGRADE_IDS) {
      expect(effectDelta(id, UPGRADE_DEFS[id].maxLevel)).toBeNull();
    }
  });

  it('formats percentages for rate upgrades and counts for integer upgrades', () => {
    expect(effectDelta('steadyCable', 0)!.next).toMatch(/%$/);
    expect(effectDelta('reinforcedCore', 0)!.next).toMatch(/^\+\d+$/);
  });
});

describe('recommendedUpgrade', () => {
  it('returns null when broke', () => {
    expect(recommendedUpgrade({}, 0)).toBeNull();
  });

  it('returns the cheapest affordable upgrade when rich', () => {
    const r = recommendedUpgrade({}, 100000);
    expect(r).toBe('steadyCable'); // cheapest baseCost (150)
  });

  it('skips maxed upgrades', () => {
    const r = recommendedUpgrade({ steadyCable: UPGRADE_DEFS.steadyCable.maxLevel }, 100000);
    expect(r).not.toBe('steadyCable');
    expect(r).not.toBeNull();
  });

  it('ignores unaffordable upgrades', () => {
    // 160 coins: steadyCable level 1 costs 150 → affordable; everything else > 160.
    expect(recommendedUpgrade({}, 160)).toBe('steadyCable');
    // But with steadyCable at level 1 its next tier costs 255 → nothing affordable.
    expect(recommendedUpgrade({ steadyCable: 1 }, 160)).toBeNull();
  });
});

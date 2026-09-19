import { describe, expect, it } from 'vitest';
import { CALLOUT_VARIANTS, type Banner, landingCallout, pushBanner, wordCallout } from '../celebrations';

describe('landingCallout', () => {
  it('given each verdict, when called at any roll, then the key is one of its variants', () => {
    for (const q of ['perfect', 'good', 'sloppy', 'miss'] as const) {
      for (const roll of [0, 0.3, 0.6, 0.999]) {
        const c = landingCallout(q, q === 'perfect' ? 1 : 0, roll);
        const n = Number(c.textKey.split('.').pop());
        expect(c.textKey.startsWith(`wordTowerV2.call.${q}.`)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(CALLOUT_VARIANTS[q]);
      }
    }
  });

  it('given different rolls, when a perfect is called, then the words vary (not one fixed string)', () => {
    const keys = new Set([0, 0.26, 0.51, 0.76].map((r) => landingCallout('perfect', 1, r).textKey));
    expect(keys.size).toBeGreaterThan(2);
  });

  it('given a perfect streak, when called, then the combo tier escalates', () => {
    expect(landingCallout('perfect', 2, 0).textKey).toBe('wordTowerV2.call.combo.double');
    expect(landingCallout('perfect', 3, 0).textKey).toBe('wordTowerV2.call.combo.triple');
    expect(landingCallout('perfect', 5, 0).textKey).toBe('wordTowerV2.call.combo.unstoppable');
    expect(landingCallout('perfect', 9, 0).textKey).toBe('wordTowerV2.call.combo.legendary');
  });

  it('given a miss, when called, then it is red, and a perfect is lime', () => {
    expect(landingCallout('miss', 0, 0).tone).toBe('red');
    expect(landingCallout('perfect', 1, 0).tone).toBe('lime');
  });
});

describe('wordCallout', () => {
  it('given word lengths, when called, then only long words earn one', () => {
    expect(wordCallout(4)).toBeNull();
    expect(wordCallout(6)).toBe('wordTowerV2.call.word.big');
    expect(wordCallout(9)).toBe('wordTowerV2.call.word.mega');
  });
});

describe('pushBanner', () => {
  const b = (key: number, priority: number): Banner => ({ key, kind: 'reward', id: 'steady', priority });

  it('given banners, when pushed, then the highest priority is shown first', () => {
    const q = pushBanner(pushBanner([], b(1, 1)), b(2, 5));
    expect(q.map((x) => x.key)).toEqual([2, 1]);
  });

  it('given equal priority, when pushed, then first come first served', () => {
    const q = pushBanner(pushBanner([], b(1, 2)), b(2, 2));
    expect(q.map((x) => x.key)).toEqual([1, 2]);
  });

  it('given a flood, when pushed, then the queue never grows past its cap (no toast pile-up)', () => {
    let q: Banner[] = [];
    for (let i = 0; i < 20; i += 1) q = pushBanner(q, b(i, i % 3));
    expect(q.length).toBeLessThanOrEqual(4);
    expect(q[0].priority).toBe(2);
  });
});

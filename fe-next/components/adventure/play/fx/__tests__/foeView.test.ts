import { describe, it, expect } from 'vitest';
import { foeView, FOE_PIPS } from '../foeView';

describe('foeView', () => {
  it('given no score, when viewed, then the foe is at full HP with every pip full', () => {
    const v = foeView(0, [40, 80, 150]);
    expect(v.max).toBe(150);
    expect(v.hp).toBe(150);
    expect(v.pips).toHaveLength(FOE_PIPS);
    expect(v.pips.every((p) => p === 1)).toBe(true);
    expect(v.defeated).toBe(false);
  });

  it('given a landed word, when viewed, then HP drops by the score and pips fill in quarters', () => {
    const v = foeView(20, [40, 80, 160]);
    expect(v.hp).toBe(140);
    // Each pip is 160/8 = 20 HP: last pip emptied, the rest full.
    expect(v.pips.filter((p) => p === 1)).toHaveLength(FOE_PIPS - 1);
    for (const p of v.pips) expect([0, 0.25, 0.5, 0.75, 1]).toContain(p);
  });

  it('given a sliver of HP left in a pip, when viewed, then the pip still shows a quarter (not dead until 0)', () => {
    const v = foeView(159, [40, 80, 160]);
    expect(v.hp).toBe(1);
    expect(v.pips[0]).toBe(0.25);
    expect(v.defeated).toBe(false);
  });

  it('given the top-star score or more, when viewed, then the foe is defeated at 0 HP', () => {
    const v = foeView(200, [40, 80, 150]);
    expect(v.hp).toBe(0);
    expect(v.defeated).toBe(true);
    expect(v.pips.every((p) => p === 0)).toBe(true);
  });

  it('given star thresholds, when viewed, then each star sits where that much damage empties the bar and lights once earned', () => {
    const v = foeView(80, [40, 80, 160]);
    expect(v.marks.map((m) => m.at)).toEqual([0.75, 0.5, 0]);
    expect(v.marks.map((m) => m.earned)).toEqual([true, true, false]);
  });

  it('given a zero top star (bad data), when viewed, then it does not divide by zero', () => {
    const v = foeView(0, [0, 0, 0]);
    expect(v.max).toBe(1);
    expect(v.pips.every((p) => Number.isFinite(p))).toBe(true);
  });
});

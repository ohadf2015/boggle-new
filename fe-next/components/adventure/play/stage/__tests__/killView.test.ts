import { describe, it, expect } from 'vitest';
import { overkillTier, KILL_TIERS, flyTarget } from '../killView';

describe('overkillTier — Bookworm-style overkill ladder', () => {
  it('given an exact kill, then it is the lowest tier', () => {
    expect(overkillTier(0, 100)).toBe('squashed');
  });
  it('given bigger overkill relative to the enemy, then the tier escalates in order', () => {
    const tiers = [0, 12, 30, 60, 150].map((o) => overkillTier(o, 100));
    expect(tiers).toEqual(['squashed', 'whomped', 'crushed', 'destroyed', 'obliterated']);
    expect(tiers.map((x) => KILL_TIERS.indexOf(x))).toEqual([0, 1, 2, 3, 4]);
  });
  it('given a zero max HP, then it never throws', () => {
    expect(overkillTier(5, 0)).toBe('obliterated');
  });
});

describe('flyTarget — where the minted reward flies', () => {
  const rect = (x: number, y: number, w = 36, h = 36) => ({ left: x, top: y, width: w, height: h });
  it('given relics in the bar, then it lands just past the last one', () => {
    expect(flyTarget([rect(20, 100), rect(60, 100)], null, 390)).toEqual({ x: 60 + 36 + 4 + 18, y: 118 });
  });
  it('given an RTL bar, then it lands just before the last one', () => {
    expect(flyTarget([rect(330, 100), rect(290, 100)], null, 390, true)).toEqual({ x: 290 - 4 - 18, y: 118 });
  });
  it('given no relics, then it falls back to the HUD anchor centre', () => {
    expect(flyTarget([], rect(16, 200, 100, 40), 390)).toEqual({ x: 66, y: 220 });
  });
  it('given nothing to aim at, then it flies to the top corner', () => {
    expect(flyTarget([], null, 390)).toEqual({ x: 390 - 40, y: 40 });
  });
});

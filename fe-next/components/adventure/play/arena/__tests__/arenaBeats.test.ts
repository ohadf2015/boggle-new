import { describe, it, expect } from 'vitest';
import { arcAt, missileFontSize, castImpactMs, floatRise, hitStopMs, knockPx, lootBurst, LOOT_WINDOW_MS, wordPower } from '../arenaBeats';
import { castTiming } from '../../fx/castPath';

describe('wordPower', () => {
  it('rises with word length and saturates at 1', () => {
    expect(wordPower(3)).toBeLessThan(wordPower(5));
    expect(wordPower(5)).toBeLessThan(wordPower(8));
    expect(wordPower(12)).toBeLessThanOrEqual(1);
    expect(wordPower(0)).toBeGreaterThanOrEqual(0);
  });
});

describe('castImpactMs', () => {
  // The bridge: the DOM board throws the traced letters, the canvas throws the
  // punch. If these two numbers ever drift, one word reads as two hits.
  it('lands on the very frame the DOM bolt reaches the foe', () => {
    expect(castImpactMs('storm', false)).toBe(castTiming(5, false).impactMs);
    expect(castImpactMs('ab', false)).toBe(castTiming(2, false).impactMs);
  });

  it('is later for a longer word, because its letters take longer to arrive', () => {
    expect(castImpactMs('go', false)).toBeLessThan(castImpactMs('gorgeous', false));
  });

  it('is immediate under reduced motion', () => {
    expect(castImpactMs('storm', true)).toBe(0);
  });

  it('counts code points, not code units, so RTL and emoji-width scripts line up', () => {
    expect(castImpactMs('שלום', false)).toBe(castTiming(4, false).impactMs);
  });
});

describe('floatRise', () => {
  // A callout that leaves the stage before anyone can read it is not a callout.
  // The first version rose at 0.055 px per ms PER POINT of font size — a 22px
  // "-1 ♥" travelled ~1300px in its 1.1s life, off a 200px stage in three frames.
  it('keeps a callout on a phone-sized stage for its whole life', () => {
    const STAGE_H = 200;
    for (const size of [17, 22, 30]) {
      for (const life of [800, 900, 1100]) {
        const rise = Math.abs(floatRise(size, life)) * life;
        expect(rise).toBeGreaterThan(size * 0.4);
        expect(rise).toBeLessThan(STAGE_H * 0.45);
      }
    }
  });

  it('rises, never sinks', () => {
    expect(floatRise(22, 1000)).toBeLessThan(0);
  });

  it('travels the same distance however long it hangs, so speed follows the life', () => {
    expect(Math.abs(floatRise(22, 500))).toBeGreaterThan(Math.abs(floatRise(22, 2000)));
  });

  it('survives a zero or negative life without dividing by zero', () => {
    expect(Number.isFinite(floatRise(22, 0))).toBe(true);
  });
});

describe('hitStopMs / knockPx', () => {
  it('scale with power and stay bounded', () => {
    expect(hitStopMs(0)).toBeLessThan(hitStopMs(1));
    expect(hitStopMs(1)).toBeLessThanOrEqual(160);
    expect(knockPx(0, 358)).toBeLessThan(knockPx(1, 358));
    expect(knockPx(1, 358)).toBeLessThan(358 / 4);
  });

  it('is zero under reduced motion', () => {
    expect(hitStopMs(1, true)).toBe(0);
    expect(knockPx(1, 358, true)).toBe(0);
  });
});

describe('lootBurst', () => {
  it('mints coins plus the relic when there is one, and only coins otherwise', () => {
    const withRelic = lootBurst(12, true);
    expect(withRelic.some((p) => p.kind === 'relic')).toBe(true);
    expect(lootBurst(12, false).every((p) => p.kind === 'coin')).toBe(true);
  });

  it('caps the coin count so a big payout never floods the stage', () => {
    expect(lootBurst(9999, false).length).toBeLessThanOrEqual(12);
  });

  it('gives every piece its own delay so they leave the corpse as a stream', () => {
    const b = lootBurst(8, true);
    expect(new Set(b.map((p) => p.delayMs)).size).toBeGreaterThan(1);
  });

  // THE BUG THIS PINS: the payout used to run ~1.9s from the corpse, but
  // `CombatOverlay` slams an OPAQUE full-screen kill banner over the whole
  // screen 1150ms after the foe dies — corpse, gold pill and relic bar all
  // gone. Every coin after that frame flew where nobody could see it. The
  // burst must finish inside the window it actually has.
  it('lands every piece before the kill banner covers the screen', () => {
    for (const gold of [0, 12, 400, 9999]) {
      for (const relic of [false, true]) {
        for (const w of [LOOT_WINDOW_MS, 700]) {
          for (const p of lootBurst(gold, relic, w)) {
            expect(p.delayMs).toBeGreaterThanOrEqual(0);
            expect(p.delayMs + p.durationMs).toBeLessThanOrEqual(w + 0.001);
          }
        }
      }
    }
  });

  it('lands the relic last, so the trophy is the beat you end on', () => {
    const b = lootBurst(60, true);
    const relic = b.find((p) => p.kind === 'relic')!;
    const landing = (p: { delayMs: number; durationMs: number }) => p.delayMs + p.durationMs;
    for (const coin of b.filter((p) => p.kind === 'coin')) {
      expect(landing(relic)).toBeGreaterThanOrEqual(landing(coin));
    }
  });

  it('still starts paying out immediately', () => {
    expect(Math.min(...lootBurst(60, true).map((p) => p.delayMs))).toBeLessThanOrEqual(60);
  });
});

describe('arcAt', () => {
  const from = { x: 0, y: 100 };
  const to = { x: 200, y: 60 };

  it('starts on the launcher and ends on the target', () => {
    expect(arcAt(0, from, to, 50)).toEqual({ x: 0, y: 100 });
    expect(arcAt(1, from, to, 50)).toEqual({ x: 200, y: 60 });
  });

  it('lifts the midpoint by the full arc height (a throw, not a straight line)', () => {
    const mid = arcAt(0.5, from, to, 40);
    expect(mid.x).toBeCloseTo(100);
    // Halfway between the ends is y=80; the arc must be `lift` ABOVE it.
    expect(mid.y).toBeCloseTo(40);
  });

  it('clamps outside 0..1 instead of flying off the stage', () => {
    expect(arcAt(-1, from, to, 40)).toEqual({ x: 0, y: 100 });
    expect(arcAt(9, from, to, 40)).toEqual({ x: 200, y: 60 });
  });
});

describe('missileFontSize', () => {
  it('holds one readable size for ordinary words, then shrinks to fit a monster', () => {
    // Bookworm's cast word is a constant size; only the words that would run off
    // the stage give any of it back.
    expect(missileFontSize(9, 358, 200)).toBe(missileFontSize(3, 358, 200));
    expect(missileFontSize(16, 358, 200)).toBeLessThan(missileFontSize(3, 358, 200));
  });

  it('never gets so small it stops reading on a phone', () => {
    expect(missileFontSize(12, 358, 200)).toBeGreaterThanOrEqual(11);
  });

  it('keeps the whole word inside the stage width', () => {
    for (const n of [3, 5, 7, 9, 12]) {
      // ~0.62em per glyph for a heavy display face, plus the chip padding.
      expect(missileFontSize(n, 358, 200) * 0.62 * n).toBeLessThan(358);
    }
  });
});

describe('floatRise cap', () => {
  // A callout that starts clear of the DOM HUD must not DRIFT back under it.
  it('never rises further than the cap it is given', () => {
    for (const size of [17, 22, 35]) {
      const life = 1100;
      const rise = Math.abs(floatRise(size, life, 25)) * life;
      expect(rise).toBeLessThanOrEqual(25.0001);
      expect(rise).toBeGreaterThan(0);
    }
  });

  it('leaves the uncapped rise exactly as it was', () => {
    expect(floatRise(22, 900, undefined)).toBe(floatRise(22, 900));
    // A cap larger than the natural rise changes nothing.
    expect(floatRise(22, 900, 9999)).toBe(floatRise(22, 900));
  });
});

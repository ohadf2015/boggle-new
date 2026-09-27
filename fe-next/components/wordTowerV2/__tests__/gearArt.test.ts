import { describe, expect, it } from 'vitest';
import type { Graphics } from 'pixi.js';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { gearFromEstate } from '@/lib/wordTowerV2/gear';
import { paintGear } from '../gearArt';

/** Records every draw call; every method chains like Pixi's. */
function recorder() {
  const calls: Array<{ fn: string; args: unknown[] }> = [];
  const g = new Proxy({} as Record<string, unknown>, {
    get: (_t, fn: string) => (...args: unknown[]) => {
      calls.push({ fn, args });
      return g;
    },
  });
  return { g: g as unknown as Graphics, calls };
}

const floors = Array.from({ length: 6 }, (_, i) => ({ x: 0, y: -17 - i * 34, widthPx: 140, heightPx: 34, angleRad: 0 }));
const estateAt = (lvl: number) => ({ ...emptyEstate(), plots: PLOT_SLOTS.map((slot) => ({ slot, level: lvl, damaged: false })) });

describe('paintGear', () => {
  it('given nothing built, then the tower is painted bare (cleared, nothing drawn)', () => {
    const { g, calls } = recorder();
    paintGear(g, gearFromEstate(emptyEstate()), floors, 1, 0);
    expect(calls.map((c) => c.fn)).toEqual(['clear']);
  });

  it('given every part maxed, then plinth, braces, cornices and the crown are all drawn', () => {
    const { g, calls } = recorder();
    paintGear(g, gearFromEstate(estateAt(5)), floors, 1, 0);
    const fills = calls.filter((c) => c.fn === 'fill').length;
    // 5 plinth steps + 2 piles + glow, 12 brace columns + rivets, 6 cornices + 12 lamps, dome + crown + 3 gems
    expect(fills).toBeGreaterThan(40);
  });

  it('given a crown, then it sits ABOVE the top floor', () => {
    const { g, calls } = recorder();
    const only = { ...gearFromEstate(emptyEstate()), landmark: gearFromEstate(estateAt(5)).landmark };
    paintGear(g, only, floors, 1, 0);
    const ys = calls.filter((c) => c.fn === 'poly').flatMap((c) => (c.args[0] as number[]).filter((_, i) => i % 2 === 1));
    const topOfTower = floors[5].y - 17;
    expect(Math.max(...ys)).toBeLessThanOrEqual(topOfTower + 0.01);
  });

  it('given no standing floors, then nothing is drawn', () => {
    const { g, calls } = recorder();
    paintGear(g, gearFromEstate(estateAt(5)), [], 1, 0);
    expect(calls.map((c) => c.fn)).toEqual(['clear']);
  });
});

describe('paintGear — culling', () => {
  it('given floors off screen, then their trim is not drawn', () => {
    const all = recorder();
    paintGear(all.g, gearFromEstate(estateAt(5)), floors, 1, 0);
    const culled = recorder();
    // Only the two lowest floors are in view.
    paintGear(culled.g, gearFromEstate(estateAt(5)), floors, 1, 0, { top: -70, bottom: 200 });
    expect(culled.calls.length).toBeLessThan(all.calls.length);
  });
});

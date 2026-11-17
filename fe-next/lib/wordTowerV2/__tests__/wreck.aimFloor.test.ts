import { describe, expect, it } from 'vitest';
import {
  aimWreckAtFloor,
  buildWreckWorldFromTower,
  hangBall,
  pathHitsTower,
  stepWreck,
  towerFromWords,
} from '../wreck';

const WORDS = ['ground', 'midlow', 'midhigh', 'rooftop'];

function atBottom(world: ReturnType<typeof buildWreckWorldFromTower>) {
  hangBall(world);
  stepWreck(world, world.quarterPeriodMs);
}

describe('aimWreckAtFloor', () => {
  it('a bottom-of-swing cut at a called floor first hits that floor', () => {
    for (const floor of [0, 1, 2, 3]) {
      const w = buildWreckWorldFromTower(towerFromWords(WORDS), { aimFloor: floor });
      atBottom(w);
      const hit = pathHitsTower(w);
      expect(hit, `expected a hit when aiming at floor ${floor}`).not.toBeNull();
      expect(hit!.floor).toBe(floor);
    }
  });

  it('with no called floor, a bottom-of-swing cut still hits the mid-tower face', () => {
    const w = buildWreckWorldFromTower(towerFromWords(WORDS));
    atBottom(w);
    const hit = pathHitsTower(w);
    expect(hit).not.toBeNull();
    // 4 floors, mid-height is around floors 1–2
    expect(hit!.floor).toBeGreaterThanOrEqual(1);
    expect(hit!.floor).toBeLessThanOrEqual(2);
  });

  it('re-aiming after the world is built moves the hit to the new floor', () => {
    const w = buildWreckWorldFromTower(towerFromWords(WORDS));
    aimWreckAtFloor(w, 0);
    atBottom(w);
    expect(pathHitsTower(w)?.floor).toBe(0);
  });
});

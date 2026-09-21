import { describe, expect, it } from 'vitest';
import { braceTower, createTowerWorld, reviveWorld, snapshotWorld, spawnBlock, stepWorld } from '../engine';
import { type RiskBlock, isCounterweight, standingChain, towerLean } from '../stability';

const H = 34;
const floor = (n: number, x: number, id: string, w = 140, extra: Partial<RiskBlock> = {}) => ({
  id,
  x,
  y: -H / 2 - n * H,
  widthPx: w,
  heightPx: H,
  angleRad: 0,
  ...extra,
});

const advance = (world: ReturnType<typeof createTowerWorld>, ms: number) => {
  for (let t = 0; t < ms; t += 16.667) stepWorld(world, 16.667);
};

describe('standingChain — what is still up after a crash', () => {
  it('given an upright stack plus a slab lying in the street, then only the stack stands', () => {
    const ids = standingChain([floor(0, 0, 'a'), floor(1, 4, 'b'), floor(0, 400, 'street'), floor(2, 2, 'c')]);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('given a floor knocked over mid-tower, then the chain stops below it', () => {
    const ids = standingChain([floor(0, 0, 'a'), floor(1, 0, 'b'), floor(2, 0, 'c', 140, { angleRad: 0.9 }), floor(3, 0, 'd')]);
    expect(ids).toEqual(['a', 'b']);
  });

  it('given nothing on the ground floor, then nothing stands', () => {
    expect(standingChain([floor(3, 0, 'x')])).toEqual([]);
  });
});

describe('counterweight — landing against the lean steadies the tower', () => {
  it('given a tower leaning right, then its lean is positive', () => {
    expect(towerLean([floor(0, 0, 'a'), floor(1, 30, 'b'), floor(2, 50, 'c')])).toBeGreaterThan(20);
  });

  it('given a lean, when a floor lands on the opposite side and pulls the load back, then it counts as a counterweight', () => {
    expect(isCounterweight(40, 8, -30, 70)).toBe(true);
  });

  it('given a lean, when a floor lands on the SAME side, then it is not a counterweight', () => {
    expect(isCounterweight(40, 55, 30, 70)).toBe(false);
  });

  it('given a tower that was already straight, then nothing to counter', () => {
    expect(isCounterweight(2, 0, -10, 70)).toBe(false);
  });
});

describe('reviveWorld — continue from the floors still standing', () => {
  it('given a tower that toppled, when revived with its standing floors, then the run is live again and the record is kept', () => {
    const world = createTowerWorld({ seed: 3 });
    for (let i = 0; i < 6; i += 1) {
      spawnBlock(world, { id: `off-${i}`, x: i * 40, y: -34 * i - 220, widthPx: 96, heightPx: 34, vx: 0 });
      advance(world, 1100);
    }
    advance(world, 2500);
    expect(world.collapsed).toBe(true);
    const peakBefore = world.runPeakPx;

    const landed = snapshotWorld(world).blocks.filter((b) => world.landed.has(b.id));
    const keep = standingChain(landed);
    expect(keep.length).toBeGreaterThanOrEqual(1);
    const removed = reviveWorld(world, new Set(keep));

    expect(world.collapsed).toBe(false);
    expect(removed.length).toBeGreaterThan(0);
    expect([...world.blocks.keys()].sort()).toEqual([...keep].sort());
    expect(world.runPeakPx).toBe(peakBefore);
    advance(world, 1500);
    expect(world.collapsed).toBe(false);
  });
});

describe('braceTower — the emergency brace', () => {
  it('given a tower still rocking, when braced keeping the top floor, then every lower floor is fixed at once', () => {
    const world = createTowerWorld({ seed: 1 });
    for (let i = 0; i < 4; i += 1) {
      spawnBlock(world, { id: `b${i}`, x: i * 6, y: -(i * 34 + 40), widthPx: 140, heightPx: 34, vx: 0 });
      advance(world, 700);
    }
    // Knock the tower so nothing is "resting" — weldBelow would refuse these.
    for (const body of world.blocks.values()) body.angularVelocity = 0.05;
    const braced = braceTower(world, 1);
    expect(braced.sort()).toEqual(['b0', 'b1', 'b2']);
    expect(world.blocks.get('b3')!.isStatic).toBe(false);
  });
});

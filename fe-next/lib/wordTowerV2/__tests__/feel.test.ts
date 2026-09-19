import { describe, expect, it } from 'vitest';
import {
  CRANE_CLEARANCE_PX,
  SWING,
  fallTimeMs,
  predictLandingX,
  releaseKinematics,
} from '../crane';
import { GRAVITY_PX_PER_MS2, createTowerWorld, releaseBlock, spawnBlock, stepWorld } from '../engine';
import { GOOD_RATIO, PERFECT_RATIO } from '../landing';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';
import { frameCamera } from '../camera';

/**
 * The feel contract. v2 round 2 was "impossible to align": the throw arc drew
 * only the first 40% of the fall, so every drop landed well past where it
 * pointed, and a perfect landing was a ~9ms window. These pin what a player
 * actually experiences, in ms and screen px, not in tuning constants.
 */

const dropPx = CRANE_CLEARANCE_PX - BLOCK_HEIGHT_PX / 2;

/** Where the block lands for a release at time t (tower centred at x=0). */
const landingAt = (t: number) => {
  const k = releaseKinematics(t, SWING, 0);
  return predictLandingX(k.x, k.vx, dropPx);
};

/** Average ms per crossing that the landing sits inside `halfBand` of centre. */
function windowMs(halfBand: number): number {
  const stepMs = 0.25;
  let inside = 0;
  for (let t = 0; t < SWING.periodMs; t += stepMs) if (Math.abs(landingAt(t)) < halfBand) inside += stepMs;
  return inside / 2; // two crossings per period
}

describe('predictLandingX', () => {
  it('given a mid-swing release, when physics runs, then it lands where the guide said', () => {
    // Given a block released at full sideways speed, one clearance above the ground
    const world = createTowerWorld({ seed: 1 });
    const t = SWING.periodMs / 2; // passing centre, fastest
    const k = releaseKinematics(t, SWING, 0);
    const w = blockWidthForWord('tower');
    spawnBlock(world, { id: 'b', x: k.x, y: -CRANE_CLEARANCE_PX, widthPx: w, heightPx: BLOCK_HEIGHT_PX, vx: 0, attached: true });
    releaseBlock(world, 'b', k.vx, 0);

    // When it falls until first contact
    let steps = 0;
    while (!world.landed.has('b') && steps < 600) {
      stepWorld(world, 1000 / 120);
      steps += 1;
    }

    // Then contact x matches the prediction
    expect(world.landed.has('b')).toBe(true);
    expect(Math.abs(world.blocks.get('b')!.position.x - predictLandingX(k.x, k.vx, dropPx))).toBeLessThan(5);
  });

  it('given the fall, when timed, then gravity alone sets it', () => {
    expect(fallTimeMs(300)).toBeCloseTo(Math.sqrt(600 / GRAVITY_PX_PER_MS2), 6);
  });
});

describe('timing windows (5-letter word on a 5-letter tower)', () => {
  const halfW = blockWidthForWord('tower') / 2;

  it('given a perfect band, when timed, then it is humanly hittable (50-140ms)', () => {
    const ms = windowMs(PERFECT_RATIO * halfW);
    expect(ms).toBeGreaterThanOrEqual(50);
    expect(ms).toBeLessThanOrEqual(140);
  });

  it('given a good band, when timed, then it is forgiving (>=150ms)', () => {
    expect(windowMs(GOOD_RATIO * halfW)).toBeGreaterThanOrEqual(150);
  });

  it('given the whole swing, when timed, then a careless tap can still miss', () => {
    // Landing anywhere on the block is < 80% of the period — the game stays a game.
    expect(windowMs(halfW) * 2).toBeLessThan(SWING.periodMs * 0.8);
  });
});

describe('block size on screen', () => {
  it('given a phone, when framed, then a 5-letter block is big and tappable-looking', () => {
    const { scale } = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 0 });
    // Round 5: 60px / 38%-of-width slabs still left half the screen empty.
    expect(BLOCK_HEIGHT_PX * scale).toBeGreaterThanOrEqual(68);
    expect(blockWidthForWord('tower') * scale).toBeGreaterThanOrEqual(390 * 0.55);
    expect(blockWidthForWord('גדר') * scale).toBeGreaterThanOrEqual(390 * 0.48);
  });

  it('given a desktop, when framed, then blocks grow to use the space', () => {
    const { scale } = frameCamera({ viewportW: 1440, viewportH: 900, dockPx: 230, towerTopM: 0 });
    expect(BLOCK_HEIGHT_PX * scale).toBeGreaterThanOrEqual(64);
  });
});

import { describe, expect, it } from 'vitest';
import { releaseKinematics } from '../crane';
import {
  FIXED_DT_MS,
  PX_PER_M,
  createTowerWorld,
  moveAttachedBlock,
  releaseBlock,
  snapshotWorld,
  spawnBlock,
  stepWorld,
} from '../engine';

const block = (x: number, y: number, id: string, widthPx = 96) => ({
  id,
  x,
  y,
  widthPx,
  heightPx: 34,
  vx: 0,
});

/** Run the world forward by wall-clock milliseconds. */
const advance = (world: ReturnType<typeof createTowerWorld>, ms: number) => {
  // Feed it in realistic 60fps chunks so the accumulator is exercised the way a
  // real rAF loop would exercise it, not one giant step.
  for (let elapsed = 0; elapsed < ms; elapsed += 16.667) {
    stepWorld(world, 16.667);
  }
};

describe('stepWorld fixed timestep', () => {
  it('given a 60fps frame, when stepped, then runs exactly two 120Hz substeps', () => {
    const world = createTowerWorld({ seed: 1 });

    expect(stepWorld(world, 16.667)).toBe(2);
  });

  it('given a frame shorter than one substep, when stepped, then defers and banks the time', () => {
    const world = createTowerWorld({ seed: 1 });

    expect(stepWorld(world, 5)).toBe(0);
    expect(stepWorld(world, 5)).toBe(1);
  });

  it('given a long stall, when stepped, then clamps substeps so it cannot spiral', () => {
    const world = createTowerWorld({ seed: 1 });

    // A backgrounded tab hands back a huge delta. Simulating all of it would
    // freeze the main thread and then hand back an even bigger delta.
    expect(stepWorld(world, 5000)).toBeLessThanOrEqual(8);
  });

  it('given identical inputs, when two worlds run, then snapshots match exactly', () => {
    const a = createTowerWorld({ seed: 7 });
    const b = createTowerWorld({ seed: 7 });

    for (const w of [a, b]) {
      spawnBlock(w, block(0, -400, 'one'));
      advance(w, 900);
      spawnBlock(w, { ...block(30, -400, 'two'), vx: 0.12 });
      advance(w, 900);
    }

    expect(snapshotWorld(a)).toEqual(snapshotWorld(b));
  });
});

describe('settling', () => {
  it('given a block dropped on the ground, when it lands, then it comes to rest', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, block(0, -300, 'solo'));

    advance(world, 2500);

    const [b] = snapshotWorld(world).blocks;
    expect(b.resting).toBe(true);
    expect(Math.abs(b.angleRad)).toBeLessThan(0.05);
  });

  it('given a block resting flat, when measured, then tower height is about one block', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, block(0, -300, 'solo'));

    advance(world, 2500);

    const heightM = snapshotWorld(world).towerHeightM;
    expect(heightM).toBeGreaterThan(0);
    expect(heightM).toBeLessThan(34 / PX_PER_M + 0.2);
  });
});

describe('emergent collapse', () => {
  it('given blocks stacked squarely, when settled, then the tower stands', () => {
    const world = createTowerWorld({ seed: 3 });
    for (let i = 0; i < 5; i += 1) {
      spawnBlock(world, block(0, -420 - i * 40, `sq-${i}`));
      advance(world, 900);
    }
    advance(world, 1500);

    const snap = snapshotWorld(world);
    expect(snap.collapsed).toBe(false);
    expect(snap.towerHeightM).toBeGreaterThan(4 * (34 / PX_PER_M));
  });

  it('given a mild lean well inside the base, when settled, then it still stands', () => {
    // Centre of mass of a staircase of N blocks offset d sits at d*(N-1)/2.
    // 8 * 2 = 16px, comfortably inside the 48px base half-width.
    const world = createTowerWorld({ seed: 3 });
    for (let i = 0; i < 5; i += 1) {
      spawnBlock(world, block(i * 8, -34 * i - 220, `lean-${i}`));
      advance(world, 1100);
    }
    advance(world, 2000);

    expect(snapshotWorld(world).collapsed).toBe(false);
  });

  it('given a lean that walks the centre of mass off the base, when settled, then it topples', () => {
    // 40 * 2.5 = 100px, way outside the 48px base half-width. No counter and no
    // "3 sloppy drops" rule decides this — the geometry does.
    const world = createTowerWorld({ seed: 3 });
    for (let i = 0; i < 6; i += 1) {
      spawnBlock(world, block(i * 40, -34 * i - 220, `off-${i}`));
      advance(world, 1100);
    }
    advance(world, 2500);

    expect(snapshotWorld(world).collapsed).toBe(true);
  });
});

describe('crane attachment', () => {
  it('given a block on the crane, when time passes, then it does not fall', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { ...block(0, -400, 'hung'), attached: true });

    advance(world, 1200);

    expect(snapshotWorld(world).blocks[0].y).toBeCloseTo(-400, 3);
  });

  it('given a block on the crane, when moved, then it tracks the crane', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { ...block(0, -400, 'hung'), attached: true });

    moveAttachedBlock(world, 'hung', 120, -400);
    advance(world, 200);

    expect(snapshotWorld(world).blocks[0].x).toBeCloseTo(120, 3);
  });

  it('given a released block, when it falls, then it lands and counts toward height', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { ...block(0, -300, 'hung'), attached: true });
    advance(world, 500);

    releaseBlock(world, 'hung', 0);
    advance(world, 2000);

    const snap = snapshotWorld(world);
    expect(snap.blocks[0].resting).toBe(true);
    expect(snap.towerHeightM).toBeGreaterThan(0);
  });
});

describe('drop feel', () => {
  it('given a mid-swing release, when it falls, then it arrives tilted and ends flat', () => {
    // The crane's swing is the source of the drop's character: release at the
    // apex and the block arrives square, release through the centre and it
    // arrives cocked. Uses the real crane maths so this cannot pass on a spin
    // the game is incapable of producing.
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { ...block(0, -300, 'settler'), attached: true });
    advance(world, 200);
    const release = releaseKinematics(0, { amplitudeRad: 0.62, periodMs: 2200, phase: 0 }, 0);
    releaseBlock(world, 'settler', release.vx, release.spin);

    let maxTiltInFlight = 0;
    for (let t = 0; t < 600; t += 16.667) {
      stepWorld(world, 16.667);
      maxTiltInFlight = Math.max(maxTiltInFlight, Math.abs(snapshotWorld(world).blocks[0].angleRad));
    }
    advance(world, 1500);

    // Arrived visibly cocked (>3 degrees)...
    expect(maxTiltInFlight).toBeGreaterThan(0.05);
    // ...and a squat block settles flat rather than resting on a corner. A brick
    // thudding level IS correct here — the aliveness lives in the tower, below.
    expect(Math.abs(snapshotWorld(world).blocks[0].angleRad)).toBeLessThan(0.03);
  });

  it('given a tall tower, when a block lands on it, then the stack visibly reacts', () => {
    // THIS is the feel property, not per-block bounce. A rigid stack that
    // absorbs an impact without moving reads as painted-on scenery. A compliant
    // one transmits the landing down the tower, which is what makes height feel
    // precarious rather than decorative.
    const world = createTowerWorld({ seed: 5 });
    for (let i = 0; i < 6; i += 1) {
      spawnBlock(world, block(0, -34 * i - 220, `base-${i}`));
      advance(world, 1000);
    }

    const before = snapshotWorld(world).blocks.map((b) => b.angleRad);
    spawnBlock(world, { ...block(14, -34 * 6 - 220, 'impact'), vx: 0.06 });

    let peakShift = 0;
    for (let t = 0; t < 900; t += 16.667) {
      stepWorld(world, 16.667);
      const now = snapshotWorld(world).blocks;
      for (let i = 0; i < before.length; i += 1) {
        peakShift = Math.max(peakShift, Math.abs(now[i].angleRad - before[i]));
      }
    }

    expect(peakShift).toBeGreaterThan(0.002);
  });


  it('given a 300px fall, when released, then contact lands in the tuned window', () => {
    // Feel target from the spec: release -> first contact in 380-520ms. Under
    // 300ms a drop reads as a teleport; over ~550ms it reads as floaty.
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, block(0, -300, 'timed'));

    let contactMs = -1;
    for (let t = 0; t < 2000 && contactMs < 0; t += 16.667) {
      stepWorld(world, 16.667);
      if (snapshotWorld(world).blocks[0].y > -19) contactMs = t;
    }

    expect(contactMs).toBeGreaterThanOrEqual(380);
    expect(contactMs).toBeLessThanOrEqual(520);
  });
});

describe('constants', () => {
  it('given the sim rate, when read, then it is 120Hz', () => {
    expect(FIXED_DT_MS).toBeCloseTo(1000 / 120, 6);
  });
});

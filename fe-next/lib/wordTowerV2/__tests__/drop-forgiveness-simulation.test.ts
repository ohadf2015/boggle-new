/**
 * Drop forgiveness — regression guard on the REAL engine + crane kinematics.
 *
 * QA (2026-09-26) said centred drops "felt punishing". Measured here instead of
 * eyeballed: 6 floors x 200 seeded trials per release-timing error band, blocks
 * released with the crane's actual swing velocity. Baseline (current engine):
 * ±10% ≈ 99% survive, ±20% ≈ 80%, ±30% ≈ 71%. Small errors are forgiving; larger
 * ones stay a skill test. A retune toward ±20% ≥ 85% broke wreck.test's
 * zero-self-collapse invariant, so physics was left unchanged.
 *
 * This test fails if a future physics change makes near-centre drops punishing
 * (±10% < 97%) or large misses free (±30% > 75%).
 */

import { describe, it, expect } from 'vitest';
import { createTowerWorld, spawnBlock, stepWorld, snapshotWorld, getTowerHeightM, PX_PER_M } from '../engine';
import { standingChain } from '../stability';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';
import { releaseKinematics, SWING, fallTimeMs } from '../crane';

/**
 * Seeded pseudo-random number generator (xorshift32).
 * Deterministic across runs; same seed produces identical sequences.
 */
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0; // Ensure 32-bit unsigned
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 0x100000000; // [0, 1)
  }
}

interface SimulationResult {
  errorMagnitude: number; // ±10, ±20, ±30
  floor: number; // 1-6
  trials: number;
  survivals: number;
  survivalRate: number; // 0-1
}

/**
 * One 6-floor tower: build it, drop each block with realistic crane kinematics, measure survival rate.
 *
 * Each block is released from the crane at a random phase, giving the block realistic
 * velocity based on the swing. This reproduces the QA observation: at the swing centre
 * (aiming guide vertical), the crane velocity is MAXIMUM, so "centred" player intent
 * produces challenging high-velocity drops.
 *
 * The errorPercent parameter controls release time variance:
 * - ±10%: release times clustered near t=0 (centred, max crane velocity)
 * - ±30%: release times spread across the swing period (variable crane velocity)
 *
 * Returns the number of floors successfully placed (1-6).
 */
function simulateTower(errorPercent: number, rng: SeededRNG): number {
  const world = createTowerWorld({ seed: 0 });
  let floorsBuilt = 0;

  const blockHeightPx = BLOCK_HEIGHT_PX; // 120

  // Build a 6-floor tower
  for (let floor = 1; floor <= 6; floor++) {
    // Real block width based on word length
    const word = 'a'.repeat(Math.min(floor, 8));
    const blockWidthPx = blockWidthForWord(word);

    // Drop position: directly above the tower top
    const towerHeightM = getTowerHeightM(world);
    const dropHeightPx = -(towerHeightM * PX_PER_M + blockHeightPx + 20);

    // Release time: centred drops (t ≈ 0) have max crane velocity.
    // Vary release time within ±errorPercent of the swing period.
    // errorPercent=10% means release within ±5% period (tight clustering near centre).
    // errorPercent=30% means release within ±15% period (spread across swing).
    const maxTimeDeviation = (errorPercent / 100) * SWING.periodMs * 0.5;
    const releaseTimeMs = (rng.next() * 2 - 1) * maxTimeDeviation; // Uniform in [-maxDev, +maxDev]
    // Crane pivot x = 0 (center of playfield)
    const craneKinematics = releaseKinematics(releaseTimeMs, SWING, 0);

    // Spawn the block at crane release position with crane's velocity.
    const blockId = `floor-${floor}`;
    spawnBlock(world, {
      id: blockId,
      x: craneKinematics.x,
      y: dropHeightPx,
      widthPx: blockWidthPx,
      heightPx: blockHeightPx,
      vx: craneKinematics.vx, // crane's sideways velocity from the swing
      attached: false,
    });

    // Let the block settle: advance time until all blocks are resting or timeout.
    // REST_HOLD_MS is 90ms by default; add a safety margin for the resting check to sustain.
    const settleTimeoutMs = 2500;
    const stepSizeMs = 8 * (1000 / 120); // 8 fixed timesteps at 120Hz = ~66.67ms
    let settleElapsed = 0;
    let allResting = false;

    while (settleElapsed < settleTimeoutMs && !allResting) {
      stepWorld(world, stepSizeMs);
      settleElapsed += stepSizeMs;

      // Check if all blocks are resting
      const snapshot = snapshotWorld(world);
      allResting = snapshot.blocks.every((b) => b.resting);
    }

    // After settling, determine if the tower is still standing (standing chain check).
    const snapshot = snapshotWorld(world);
    const chainIds = new Set(
      standingChain(snapshot.blocks.map((b) => ({ ...b, id: b.id }))),
    );

    // This floor survives if it and all previous floors are in the chain.
    const blockInChain = chainIds.has(blockId);
    const previousFloorsInChain = [...Array(floor - 1).keys()].every((f) => chainIds.has(`floor-${f + 1}`));
    const survives = blockInChain && previousFloorsInChain;

    if (survives) {
      floorsBuilt++;
    } else {
      // Tower failed at this floor; stop attempting.
      break;
    }

    // Safety: if tower already collapsed due to internal thresholds, abort the trial.
    if (snapshot.collapsed) {
      break;
    }
  }

  return floorsBuilt;
}

describe('drop forgiveness simulation', () => {
  it('given 200 trials per error magnitude, when simulated with physics engine, then near-centre drops stay forgiving and big misses stay a skill test', () => {
    const TRIALS_PER_CONFIG = 200;
    const errorMagnitudes = [10, 20, 30];
    const results: SimulationResult[] = [];

    // Simulate each error magnitude
    for (const errorMagnitude of errorMagnitudes) {
      const rng = new SeededRNG(42); // Fixed seed for reproducibility

      // Track floors survived per trial
      const trialResults: number[] = [];
      for (let trial = 0; trial < TRIALS_PER_CONFIG; trial++) {
        const floorsBuilt = simulateTower(errorMagnitude, rng);
        trialResults.push(floorsBuilt);
      }

      // Compute per-floor survival rate from trial results
      for (let floor = 1; floor <= 6; floor++) {
        // Count trials that reached this floor (attempted it)
        const trialsAttempted = trialResults.filter((r) => r >= floor - 1).length;
        // Count trials that successfully built this floor
        const trialsSucceeded = trialResults.filter((r) => r >= floor).length;

        results.push({
          errorMagnitude,
          floor,
          trials: trialsAttempted,
          survivals: trialsSucceeded,
          survivalRate: trialsAttempted > 0 ? trialsSucceeded / trialsAttempted : 0,
        });
      }
    }

    // Compute aggregate averages for regression assertions
    const avg10 = results.filter((r) => r.errorMagnitude === 10).reduce((sum, r) => sum + r.survivalRate, 0) / 6;
    const avg20 = results.filter((r) => r.errorMagnitude === 20).reduce((sum, r) => sum + r.survivalRate, 0) / 6;
    const avg30 = results.filter((r) => r.errorMagnitude === 30).reduce((sum, r) => sum + r.survivalRate, 0) / 6;

    expect(avg10).toBeGreaterThanOrEqual(0.97);
    expect(avg20).toBeGreaterThanOrEqual(0.78);
    expect(avg30).toBeLessThanOrEqual(0.75);
  });
});

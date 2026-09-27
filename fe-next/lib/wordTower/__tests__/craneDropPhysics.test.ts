/**
 * Word Tower — crane drop physics contracts (TDD).
 *
 * The girder used to fall on a CSS `cubic-bezier` and stop dead. These pin the
 * real-physics replacement:
 *
 *  (a) the fall is driven by {@link fallEase} (constant gravity, k²), so the
 *      block is measurably still slow at the start and fast at touchdown;
 *  (b) touchdown is followed by a DAMPED SETTLE — the block rebounds, then a
 *      much smaller second time, then rests. Never a rubber-ball bounce loop;
 *  (c) the crane HOLDS THE LOAD HIGH: the cable is a short drape and the fall
 *      distance is large enough to actually watch, for every word length.
 *
 * All pure + deterministic — none of this may touch the placement verdict.
 */
import { describe, it, expect } from 'vitest';
import {
  fallEase,
  settleBounceFrac,
  settleDurationMs,
  settleOvershoot,
  SETTLE_MIN_MS,
} from '../fallProfile';
import {
  craneCableLenPx,
  craneFallPx,
  MIN_FALL_PX,
  CABLE_DRAPE_MAX_PX,
} from '../craneGeometry';
import { craneBeamTilePx, CRANE_BEAM_TILE_MAX_PX } from '../craneBeamDisplay';

describe('(a) gravity fall', () => {
  it('accelerates — the second half of the fall covers more ground than the first', () => {
    const firstHalf = fallEase(0.5) - fallEase(0);
    const secondHalf = fallEase(1) - fallEase(0.5);
    expect(secondHalf).toBeGreaterThan(firstHalf * 2);
  });

  it('is pinned at both ends so the girder lands exactly on the shadow', () => {
    expect(fallEase(0)).toBe(0);
    expect(fallEase(1)).toBe(1);
  });
});

describe('(b) damped settle after touchdown', () => {
  it('starts and ends at rest', () => {
    expect(settleBounceFrac(0)).toBeCloseTo(0, 6);
    expect(settleBounceFrac(1)).toBeCloseTo(0, 6);
  });

  it('never dips below the resting line — a landed block only rebounds UP', () => {
    for (let k = 0; k <= 1.0001; k += 0.01) {
      expect(settleBounceFrac(k)).toBeGreaterThanOrEqual(0);
    }
  });

  it('rebounds once with authority, then only whispers — concrete, not rubber', () => {
    // Sample the curve and split it at the trough between the two rebounds.
    const step = 0.005;
    const samples: number[] = [];
    for (let k = 0; k <= 1.0001; k += step) samples.push(settleBounceFrac(k));
    const peakIdx = samples.indexOf(Math.max(...samples));
    // Find the trough after the first peak, then the second peak beyond it.
    let troughIdx = peakIdx;
    while (troughIdx + 1 < samples.length && samples[troughIdx + 1]! < samples[troughIdx]!) troughIdx++;
    const second = Math.max(...samples.slice(troughIdx));
    const first = samples[peakIdx]!;

    expect(first).toBeGreaterThan(0.4); // the first rebound is clearly visible
    expect(second).toBeGreaterThan(0); // there IS a second, so it reads as settling
    expect(second).toBeLessThan(first * 0.25); // ...but heavily damped, no bouncing ball
  });

  it('scales its duration with the drop depth but never vanishes', () => {
    expect(settleDurationMs(0)).toBeGreaterThanOrEqual(SETTLE_MIN_MS);
    expect(settleDurationMs(9)).toBeGreaterThan(settleDurationMs(0));
  });

  it('keeps the rebound height a small fraction of the fall (a girder, not a ball)', () => {
    for (const depth of [0, 3, 6, 12, 40]) {
      expect(settleOvershoot(depth)).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('(c) the crane holds the load high', () => {
  it('uses a SHORT cable drape — the load hangs just under the jib, not at the crown', () => {
    for (const beamH of [40, 90, 120, 150, 220]) {
      expect(craneCableLenPx(beamH)).toBeLessThanOrEqual(CABLE_DRAPE_MAX_PX);
    }
  });

  it('gives every real word length a watchable fall', () => {
    // beamH for an N-letter girder, as WordTowerCrane computes it.
    // One-row girder: height is a single brick, not a column of `n`.
    const beamHFor = (n: number) => craneBeamTilePx(n);
    for (let n = 3; n <= 10; n++) {
      expect(craneFallPx(beamHFor(n))).toBeGreaterThanOrEqual(MIN_FALL_PX);
    }
  });

  it('falls markedly further than the old ~44px hop', () => {
    expect(MIN_FALL_PX).toBeGreaterThanOrEqual(96);
  });

  it('keeps short-word bricks readable while capping girder height', () => {
    expect(craneBeamTilePx(3)).toBe(CRANE_BEAM_TILE_MAX_PX);
    expect(craneBeamTilePx(10)).toBeLessThan(CRANE_BEAM_TILE_MAX_PX);
  });
});

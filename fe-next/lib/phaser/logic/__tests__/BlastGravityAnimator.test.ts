/**
 * BlastGravityAnimator — pure tween parameter calculations for gravity.
 * Zero Phaser dependencies. Consumes BLAST_ANIM timing constants.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  calcFallTweenParams,
  calcBounceParams,
  calcAppearParams,
  type FallTweenParams,
  type BounceParams,
  type AppearParams,
} from '../BlastGravityAnimator';

// ─── calcFallTweenParams ──────────────────────────────────────────────────────

describe('calcFallTweenParams', () => {
  it('returns duration and ease string', () => {
    const result: FallTweenParams = calcFallTweenParams(1, 50);
    expect(typeof result.duration).toBe('number');
    expect(typeof result.ease).toBe('string');
  });

  it('duration increases with fall distance', () => {
    const short = calcFallTweenParams(1, 50);
    const long = calcFallTweenParams(4, 50);
    expect(long.duration).toBeGreaterThan(short.duration);
  });

  it('duration is positive for any non-zero fall distance', () => {
    const result = calcFallTweenParams(1, 50);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('returns 0 duration for zero fall distance', () => {
    const result = calcFallTweenParams(0, 50);
    expect(result.duration).toBe(0);
  });

  it('returns the target Y offset (fallDistance * tileSize + gap)', () => {
    const tileSize = 50;
    const fallDistance = 3;
    const result = calcFallTweenParams(fallDistance, tileSize);
    // Target Y = fallDistance * (tileSize + gap), gap = tileSize * 0.08
    const gap = tileSize * 0.08;
    expect(result.targetDeltaY).toBeCloseTo(fallDistance * (tileSize + gap), 1);
  });

  it('uses cubic easing for gravity feel', () => {
    const result = calcFallTweenParams(2, 50);
    expect(result.ease).toContain('Cubic');
  });
});

// ─── calcBounceParams ─────────────────────────────────────────────────────────

describe('calcBounceParams', () => {
  it('returns bounceCount and damping', () => {
    const result: BounceParams = calcBounceParams(3);
    expect(typeof result.bounceCount).toBe('number');
    expect(typeof result.damping).toBe('number');
  });

  it('bounceCount is at least 1 for any fall distance > 0', () => {
    const result = calcBounceParams(1);
    expect(result.bounceCount).toBeGreaterThanOrEqual(1);
  });

  it('bounceCount increases with larger fall distance', () => {
    const small = calcBounceParams(1);
    const large = calcBounceParams(5);
    expect(large.bounceCount).toBeGreaterThanOrEqual(small.bounceCount);
  });

  it('damping is between 0 and 1 (energy lost per bounce)', () => {
    const result = calcBounceParams(3);
    expect(result.damping).toBeGreaterThan(0);
    expect(result.damping).toBeLessThanOrEqual(1);
  });

  it('squashScale is less than 1 (tile compresses on landing)', () => {
    const result = calcBounceParams(2);
    expect(result.squashScale).toBeLessThan(1);
    expect(result.squashScale).toBeGreaterThan(0);
  });

  it('stretchScale is greater than 1 (tile overshoots on landing)', () => {
    const result = calcBounceParams(2);
    expect(result.stretchScale).toBeGreaterThan(1);
  });

  it('returns 0 bounces for zero fall distance', () => {
    const result = calcBounceParams(0);
    expect(result.bounceCount).toBe(0);
  });
});

// ─── calcAppearParams ─────────────────────────────────────────────────────────

describe('calcAppearParams', () => {
  it('returns startY, duration, and ease', () => {
    const result: AppearParams = calcAppearParams(0, 50);
    expect(typeof result.startYOffset).toBe('number');
    expect(typeof result.duration).toBe('number');
    expect(typeof result.ease).toBe('string');
  });

  it('startY is negative (spawns above the grid)', () => {
    const result = calcAppearParams(0, 50);
    expect(result.startYOffset).toBeLessThan(0);
  });

  it('duration is positive', () => {
    const result = calcAppearParams(0, 50);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('later spawn indices have staggered delay', () => {
    const first = calcAppearParams(0, 50);
    const third = calcAppearParams(2, 50);
    expect(third.delay).toBeGreaterThan(first.delay);
  });

  it('uses Cubic.easeIn easing for gravity fall feel', () => {
    const result = calcAppearParams(0, 50);
    expect(result.ease).toContain('Cubic');
  });
});

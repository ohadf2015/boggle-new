/**
 * Tower Bloxx signature feel contracts (TDD).
 *
 * Pins the drop→land→stack "weight" that makes Word Tower read like Bloxx:
 * release-before-center momentum, heavy accelerating fall, tower compress on
 * land, readable perfect punch, and quality-linked settle. All against real
 * shipped pure modules — no re-implementations.
 */
import { describe, it, expect } from 'vitest';
import {
  landingOffset,
  driftFracAt,
  CARRY_FACTOR,
  MAX_DRIFT,
  FALL_MS,
} from '../dropKinematics';
import { fallEase, fallDurationMs, FALL_MIN_MS, FALL_MAX_MS } from '../fallProfile';
import { impactDipPx, squashScale, IMPACT_MS, IMPACT_DEPTH, MAX_DIP_PX } from '../landingImpact';
import { punchScaleAt, PUNCH_MS, MAX_PUNCH } from '../impactPunch';
import { landFeedback } from '../landFeedback';
import { cableStretchAt, cableRecoilPx } from '../cranePendulum';
import { alignmentBand } from '../cranePlacement';

describe('Bloxx (a) release-before-center momentum', () => {
  it('carry is skill-relevant but cannot exceed the window it aims into', () => {
    // Classic Bloxx: release early, watch the block drift in. Too-soft carry
    // kills the skill; too-hard is unfair on daily leaderboards.
    //
    // This used to pin CARRY_FACTOR >= 0.55 and MAX_DRIFT in [0.3, 0.45] as bare
    // magnitudes, never relating the drift cap to the `perfect` window it has to
    // land inside. Those numbers violated the fairness this test exists to
    // protect: at MAX_DRIFT 0.38 against PERFECT_MAX 0.18, a dead-centre release
    // projected 0.187-0.380 off target and scored `good` in EVERY word-length ×
    // tower-height combination measured — the lead you had to apply was wider
    // than the window you were leading into, so aiming correctly could not score
    // well. The intent is kept; the unchecked constants are gone.
    //
    // The magnitude bound now lives in `dropCalibration.test.ts`, which pins the
    // drift:window RATIO at both ends (big enough to matter, small enough that
    // the cap does not do the player's timing for them).
    expect(CARRY_FACTOR).toBeGreaterThan(0);
    expect(MAX_DRIFT).toBeGreaterThan(0);
  });

  it('early release with inward momentum lands closer to centre', () => {
    const release = -0.35;
    const velTowardCenter = 0.0015; // trolley moving right
    const projected = landingOffset(release, velTowardCenter);
    // The mechanic contract: inward momentum genuinely pulls the landing spot
    // toward centre. This is the part that matters and it still holds.
    expect(Math.abs(projected)).toBeLessThan(Math.abs(release));
    // A stronger carry moves further than a weaker one — stated as a property of
    // `landingOffset` rather than by comparing against a hardcoded 0.4, which was
    // only `CARRY_FACTOR > 0.4` in disguise and re-pinned the magnitude this
    // file no longer owns.
    const weaker = landingOffset(release, velTowardCenter, FALL_MS, CARRY_FACTOR / 2);
    expect(Math.abs(projected)).toBeLessThan(Math.abs(weaker));
  });

  it('drift animation is ease-out (sheds speed mid-air) and lands at k=1', () => {
    expect(driftFracAt(0)).toBe(0);
    expect(driftFracAt(1)).toBe(1);
    // First half covers more ground than second (ease-out)
    expect(driftFracAt(0.5)).toBeGreaterThan(0.5);
  });
});

describe('Bloxx (b) heavy accelerating fall', () => {
  it('fallEase accelerates (gravity, not linear)', () => {
    const first = fallEase(0.5) - fallEase(0);
    const second = fallEase(1) - fallEase(0.5);
    expect(second).toBeGreaterThan(first);
  });

  it('deeper drops take longer within weighty bounds', () => {
    expect(fallDurationMs(0)).toBe(FALL_MIN_MS);
    expect(fallDurationMs(8)).toBeGreaterThan(fallDurationMs(0));
    expect(fallDurationMs(99)).toBe(FALL_MAX_MS);
    // Base window is long enough to read as a real hang (not a hop)
    expect(FALL_MIN_MS).toBeGreaterThanOrEqual(280);
    expect(FALL_MS).toBeGreaterThanOrEqual(FALL_MIN_MS);
  });
});

describe('Bloxx (c) tower compress-rebound on land', () => {
  it('peak dip is visibly weighty (≥10px at full intensity)', () => {
    expect(MAX_DIP_PX).toBeGreaterThanOrEqual(10);
    let peak = 0;
    for (let t = 0; t <= IMPACT_MS; t += 10) {
      peak = Math.max(peak, impactDipPx(0, t, 1));
    }
    expect(peak).toBeGreaterThanOrEqual(10);
    expect(peak).toBeLessThanOrEqual(MAX_DIP_PX + 0.01);
  });

  it('compression wave reaches multiple floors and dies past IMPACT_DEPTH', () => {
    const t = IMPACT_MS * 0.15;
    expect(impactDipPx(0, t, 1)).toBeGreaterThan(impactDipPx(1, t, 1));
    expect(impactDipPx(2, t, 1)).toBeGreaterThan(0);
    expect(impactDipPx(IMPACT_DEPTH, t, 1)).toBe(0);
  });
});

describe('Bloxx (d) block squash on contact', () => {
  it('landing block goes wide+flat, then settles to identity', () => {
    const s0 = squashScale(0, 1);
    expect(s0.sx).toBeGreaterThan(1.15); // weighty squash, not a twitch
    expect(s0.sy).toBeLessThan(0.9);
    const sEnd = squashScale(IMPACT_MS, 1);
    expect(sEnd.sx).toBeCloseTo(1, 2);
    expect(sEnd.sy).toBeCloseTo(1, 2);
  });
});

describe('Bloxx (e) perfect nailed-it punch', () => {
  it('punch peak is readable (≥6% scale) without exploding the scene', () => {
    expect(MAX_PUNCH).toBeGreaterThanOrEqual(0.06);
    expect(MAX_PUNCH).toBeLessThanOrEqual(0.1);
    const peak = punchScaleAt(PUNCH_MS * 0.2, 1);
    expect(peak).toBeGreaterThanOrEqual(1.05);
    expect(peak).toBeLessThanOrEqual(1 + MAX_PUNCH + 0.01);
  });

  it('perfect landFeedback fires full punch + glow + solid impact', () => {
    const p = landFeedback('perfect');
    expect(p.punchIntensity).toBe(1);
    expect(p.glow).toBe(true);
    expect(p.celebrate).toBe(true);
    expect(p.impactIntensity).toBeGreaterThanOrEqual(0.4);
    expect(p.impactIntensity).toBeLessThan(landFeedback('miss').impactIntensity);
  });
});

describe('Bloxx (f) cable personality', () => {
  it('cable stretches mid-fall under load and recoils on release', () => {
    let stretchPeak = 0;
    let recoilPeak = 0;
    for (let k = 0; k <= 1; k += 0.05) {
      stretchPeak = Math.max(stretchPeak, cableStretchAt(k, 1));
      recoilPeak = Math.min(recoilPeak, cableRecoilPx(k));
    }
    expect(stretchPeak).toBeGreaterThan(4);
    expect(recoilPeak).toBeLessThan(-2); // whip shortens (negative)
  });
});

describe('Bloxx (g) quality-linked settle wobble', () => {

  it('momentum can change the band (skill is real)', () => {
    const atRest = alignmentBand(Math.abs(landingOffset(0.1, 0)));
    const overshoot = alignmentBand(Math.abs(landingOffset(0.1, 0.004)));
    expect(atRest).toBe('perfect');
    expect(overshoot).not.toBe('perfect');
  });
});

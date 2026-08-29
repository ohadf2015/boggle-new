import { describe, expect, it } from 'vitest';
import {
  CRANE_ARM_PX,
  craneStateAt,
  releaseKinematics,
} from '../crane';

/**
 * The crane is pure math on purpose: no Matter import, no rAF. Given a time in
 * milliseconds it returns exactly one answer, so the swing is replayable and the
 * release velocity handed to the physics world is reproducible frame-for-frame.
 */
describe('craneStateAt', () => {
  it('given t=0 and zero phase, when read, then hangs at centre moving fastest', () => {
    const s = craneStateAt(0, { amplitudeRad: 0.6, periodMs: 2000, phase: 0 });

    expect(s.angleRad).toBeCloseTo(0, 6);
    // At the centre of a pendulum swing angular speed peaks.
    expect(Math.abs(s.angularVelRadPerMs)).toBeGreaterThan(0);
  });

  it('given a quarter period, when read, then sits at full amplitude with zero velocity', () => {
    const opts = { amplitudeRad: 0.6, periodMs: 2000, phase: 0 };
    const s = craneStateAt(500, opts);

    expect(s.angleRad).toBeCloseTo(0.6, 6);
    expect(s.angularVelRadPerMs).toBeCloseTo(0, 6);
  });

  it('given the same time twice, when read, then returns identical state', () => {
    const opts = { amplitudeRad: 0.42, periodMs: 1750, phase: 0.31 };

    expect(craneStateAt(1234, opts)).toEqual(craneStateAt(1234, opts));
  });

  it('given a full period elapsed, when read, then repeats the start state', () => {
    const opts = { amplitudeRad: 0.5, periodMs: 1600, phase: 0.2 };
    const a = craneStateAt(0, opts);
    const b = craneStateAt(1600, opts);

    expect(b.angleRad).toBeCloseTo(a.angleRad, 6);
    expect(b.angularVelRadPerMs).toBeCloseTo(a.angularVelRadPerMs, 6);
  });
});

describe('releaseKinematics', () => {
  it('given a release at the centre, when computed, then drops on the pivot x with lateral speed', () => {
    const k = releaseKinematics(0, { amplitudeRad: 0.6, periodMs: 2000, phase: 0 }, 100);

    expect(k.x).toBeCloseTo(100, 6);
    // Swinging through centre means the block carries sideways momentum.
    expect(Math.abs(k.vx)).toBeGreaterThan(0);
  });

  it('given a release at full amplitude, when computed, then is offset and momentarily still', () => {
    const k = releaseKinematics(500, { amplitudeRad: 0.6, periodMs: 2000, phase: 0 }, 100);

    expect(k.x).toBeCloseTo(100 + CRANE_ARM_PX * Math.sin(0.6), 4);
    expect(k.vx).toBeCloseTo(0, 6);
  });

  it('given any release, when computed, then carries no vertical velocity', () => {
    // A released block starts from rest vertically; gravity does the rest. This
    // keeps the release->contact window (a feel target) governed by gravity alone.
    expect(releaseKinematics(321, { amplitudeRad: 0.5, periodMs: 1800, phase: 0 }, 0).vy).toBe(0);
  });
});

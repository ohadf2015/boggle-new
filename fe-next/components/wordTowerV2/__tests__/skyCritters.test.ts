import { describe, it, expect } from 'vitest';
import { blinkScale, cowLift } from '../skyCritters';

describe('blinkScale', () => {
  it('given reduced motion (t=0 always), when read, then eyes stay open', () => {
    expect(blinkScale(0, 0.3)).toBe(1);
  });

  it('given a few seconds, when sampled, then the eyes close briefly and mostly stay open', () => {
    const samples = Array.from({ length: 800 }, (_, i) => blinkScale(i / 100, 0.42));
    const closed = samples.filter((v) => v < 0.5).length;
    expect(closed).toBeGreaterThan(0);
    expect(closed / samples.length).toBeLessThan(0.1);
  });
});

describe('cowLift', () => {
  it('given the beam cycle, when sampled, then the cow rises from the ground to the saucer and starts over', () => {
    expect(cowLift(0)).toBeCloseTo(0);
    expect(cowLift(1.5)).toBeGreaterThan(0.3);
    expect(cowLift(2.99)).toBeGreaterThan(0.9);
    expect(cowLift(3.01)).toBeLessThan(0.1);
  });
});

import { describe, it, expect } from 'vitest';
import { buildBurst, burstColor, BURST_COLORS } from '../collectBurst';

describe('buildBurst — collect particle generator', () => {
  it('is deterministic for the same seed', () => {
    const a = buildBurst(0.5, 'CAT-3');
    const b = buildBurst(0.5, 'CAT-3');
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    const a = buildBurst(0.5, 'CAT-3');
    const b = buildBurst(0.5, 'DOG-4');
    expect(a.particles[0].angle).not.toBe(b.particles[0].angle);
  });

  it('scales particle count with reward magnitude', () => {
    const small = buildBurst(0, 'x');
    const big = buildBurst(1, 'x');
    expect(big.particleCount).toBeGreaterThan(small.particleCount);
    expect(small.particleCount).toBeGreaterThanOrEqual(7); // floor stays lively
    expect(big.particleCount).toBeLessThanOrEqual(18); // capped, never a swarm
  });

  it('clamps out-of-range magnitude', () => {
    expect(buildBurst(-5, 'x')).toEqual(buildBurst(0, 'x'));
    expect(buildBurst(99, 'x')).toEqual(buildBurst(1, 'x'));
  });

  it('spreads particles around the full circle', () => {
    const { particles } = buildBurst(1, 'spread');
    const angles = particles.map((p) => p.angle);
    expect(Math.max(...angles)).toBeGreaterThan(Math.PI); // reaches past halfway
    expect(Math.min(...angles)).toBeLessThan(Math.PI); // and the near half too
  });

  it('emits a stable color per index, cycling the palette', () => {
    expect(burstColor(0)).toBe(BURST_COLORS[0]);
    expect(burstColor(BURST_COLORS.length)).toBe(BURST_COLORS[0]);
  });
});

import { describe, expect, it } from 'vitest';
import { impactThunk, landingBounce, squashScale } from '../juice';

describe('impactThunk', () => {
  it('given a settling micro-bump, when hit, then silent (no rattle while the stack rests)', () => {
    expect(impactThunk(3)).toBeNull();
  });

  it('given a harder landing, when hit, then louder and deeper than a soft one', () => {
    const soft = impactThunk(6)!;
    const hard = impactThunk(16)!;
    expect(hard.volume).toBeGreaterThan(soft.volume);
    expect(hard.rate).toBeLessThan(soft.rate);
    expect(hard.volume).toBeLessThanOrEqual(0.8);
  });
});

describe('squashScale', () => {
  it('given no squash, when scaled, then identity', () => {
    expect(squashScale(0)).toEqual({ sx: 1, sy: 1 });
  });

  it('given a full squash, when scaled, then wider and flatter, roughly area-preserving', () => {
    const { sx, sy } = squashScale(1);
    expect(sx).toBeGreaterThan(1);
    expect(sy).toBeLessThan(1);
    expect(sx * sy).toBeGreaterThan(0.95);
    expect(sx * sy).toBeLessThan(1.05);
  });
});

describe('landingBounce', () => {
  it('given a settled block, when bounced, then still', () => {
    expect(landingBounce(0)).toBe(0);
  });

  it('given a fresh landing, when it plays out, then it squashes, overshoots into a stretch and holds it for a beat', () => {
    const curve = Array.from({ length: 101 }, (_, i) => landingBounce(1 - i / 100));
    expect(Math.max(...curve)).toBeGreaterThan(0.5);
    const minAt = curve.indexOf(Math.min(...curve));
    expect(curve[minAt]).toBeLessThan(-0.2);
    expect(minAt).toBeGreaterThan(curve.indexOf(Math.max(...curve)));
    const held = curve.filter((v) => Math.abs(v - curve[minAt]) < 0.03).length;
    expect(held).toBeGreaterThanOrEqual(10);
  });
});

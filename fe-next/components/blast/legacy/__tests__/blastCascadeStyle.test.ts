import { describe, it, expect } from 'vitest';
import { getCascadeFallStyle, getCascadeLandStyle } from '../blastCascadeStyle';

describe('getCascadeFallStyle', () => {
  it('scales duration with fall distance', () => {
    const near = getCascadeFallStyle(0, 0);
    const far = getCascadeFallStyle(200, 0);
    const nearMs = parseInt(String(near.animation).match(/(\d+)ms/)![1], 10);
    const farMs = parseInt(String(far.animation).match(/(\d+)ms/)![1], 10);
    expect(farMs).toBeGreaterThan(nearMs);
  });

  it('clamps to a minimum of 250ms', () => {
    const style = getCascadeFallStyle(0, 0);
    const ms = parseInt(String(style.animation).match(/(\d+)ms/)![1], 10);
    expect(ms).toBeGreaterThanOrEqual(250);
  });

  it('staggers columns by 18ms (mod 5) so wide grids ripple', () => {
    const c0 = getCascadeFallStyle(100, 0);
    const c2 = getCascadeFallStyle(100, 2);
    const c5 = getCascadeFallStyle(100, 5);
    expect(String(c0.animation)).toMatch(/\b0ms forwards$/);
    expect(String(c2.animation)).toMatch(/\b36ms forwards$/);
    expect(String(c5.animation)).toMatch(/\b0ms forwards$/);
  });

  it('exposes --fall-from pointing up by the fall distance', () => {
    const s = getCascadeFallStyle(180, 1) as Record<string, string>;
    expect(s['--fall-from']).toBe('-180px');
  });
});

describe('gravity preservation', () => {
  it('still uses the blastTileFall keyframe (gravity physics intact)', () => {
    const s = getCascadeFallStyle(120, 3);
    expect(String(s.animation)).toMatch(/^blastTileFall /);
  });

  it('column stagger only delays the START — does not slow gravity duration', () => {
    const c0 = getCascadeFallStyle(160, 0);
    const c4 = getCascadeFallStyle(160, 4);
    const ms = (s: ReturnType<typeof getCascadeFallStyle>) =>
      parseInt(String(s.animation).match(/(\d+)ms/)![1], 10);
    expect(ms(c0)).toBe(ms(c4));
  });

  it('keeps the gravity easing curve (cubic-bezier(0.4, 0, 0.6, 1))', () => {
    const s = getCascadeFallStyle(80, 2);
    expect(String(s.animation)).toContain('cubic-bezier(0.4, 0, 0.6, 1)');
  });

  it('--fall-from is negative (tile starts above its destination — gravity pulls it down)', () => {
    const s = getCascadeFallStyle(120, 0) as Record<string, string>;
    expect(s['--fall-from'].startsWith('-')).toBe(true);
  });

  it('taller drops produce a larger initial offset (proportional to fall distance)', () => {
    const close = getCascadeFallStyle(40, 0) as Record<string, string>;
    const far = getCascadeFallStyle(240, 0) as Record<string, string>;
    const closeAbs = Math.abs(parseInt(close['--fall-from'], 10));
    const farAbs = Math.abs(parseInt(far['--fall-from'], 10));
    expect(farAbs).toBeGreaterThan(closeAbs);
  });
});

describe('getCascadeLandStyle', () => {
  it('returns squash transform with back.out cubic-bezier', () => {
    const s = getCascadeLandStyle();
    expect(s.transform).toBe('scaleY(1.08) scaleX(0.94)');
    expect(String(s.transition)).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });
});

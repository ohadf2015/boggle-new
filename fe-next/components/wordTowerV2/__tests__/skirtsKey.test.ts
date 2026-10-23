import { describe, expect, it } from 'vitest';
import { skirtsKey } from '../towerArt';

const skirt = { x: -80, y: -120, w: 160, h: 240 };

describe('skirtsKey', () => {
  it('given identical skirts and scale, then the key is stable so the repaint can be skipped', () => {
    expect(skirtsKey([skirt], 0.5)).toBe(skirtsKey([{ ...skirt }], 0.5));
  });

  it('given a skirt that moved, then the key changes', () => {
    expect(skirtsKey([skirt], 0.5)).not.toBe(skirtsKey([{ ...skirt, x: -70 }], 0.5));
  });

  it('given a new scale, then the key changes (line widths are scale-dependent)', () => {
    expect(skirtsKey([skirt], 0.5)).not.toBe(skirtsKey([skirt], 0.6));
  });

  it('given sub-pixel jitter from the physics solver, then the key ignores it', () => {
    expect(skirtsKey([skirt], 0.5)).toBe(skirtsKey([{ ...skirt, x: -80.004 }], 0.5));
  });
});

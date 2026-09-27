import { describe, it, expect } from 'vitest';
import { releaseFx } from '../craneReleaseFx';

describe('releaseFx — crane release feedback', () => {
  it('perfect → full celebration with glow', () => {
    const fx = releaseFx('perfect');
    expect(fx.celebrate).toBe(true);
    expect(fx.glow).toBe(true);
    expect(fx.sparkles).toBeGreaterThan(0);
  });

  it('good → small celebration, no glow', () => {
    const fx = releaseFx('good');
    expect(fx.celebrate).toBe(true);
    expect(fx.glow).toBe(false);
    expect(fx.sparkles).toBeLessThan(releaseFx('perfect').sparkles);
  });

  it('sloppy → no celebration (the verdict banner owns the bad news)', () => {
    expect(releaseFx('sloppy')).toEqual({ celebrate: false, sparkles: 0, glow: false });
  });

  it('miss → no celebration', () => {
    expect(releaseFx('miss').celebrate).toBe(false);
  });
});

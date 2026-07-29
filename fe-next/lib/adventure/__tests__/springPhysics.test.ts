import { ADVENTURE_SPRINGS, SNAPPY, BOUNCY, SMOOTH } from '../springPhysics';

describe('springPhysics — canonical presets (GF-001 audit 2026-05-01)', () => {
  it('exports all three named presets', () => {
    expect(SNAPPY).toBeDefined();
    expect(BOUNCY).toBeDefined();
    expect(SMOOTH).toBeDefined();
    expect(ADVENTURE_SPRINGS).toEqual({ SNAPPY, BOUNCY, SMOOTH });
  });

  it('every preset declares spring type + stiffness + damping', () => {
    for (const [name, cfg] of Object.entries(ADVENTURE_SPRINGS)) {
      expect(cfg.type, name).toBe('spring');
      expect(typeof cfg.stiffness, name).toBe('number');
      expect(typeof cfg.damping, name).toBe('number');
    }
  });

  it('SNAPPY is the stiffest (fast settle, minimal overshoot)', () => {
    expect(SNAPPY.stiffness).toBeGreaterThan(BOUNCY.stiffness);
    expect(SNAPPY.stiffness).toBeGreaterThan(SMOOTH.stiffness);
  });

  it('BOUNCY has lowest damping ratio (more overshoot for celebration)', () => {
    const ratio = (cfg: typeof SNAPPY) => cfg.damping / Math.sqrt(cfg.stiffness);
    expect(ratio(BOUNCY)).toBeLessThan(ratio(SNAPPY));
    expect(ratio(BOUNCY)).toBeLessThan(ratio(SMOOTH));
  });
});

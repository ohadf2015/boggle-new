// ─── TimeDilation Tests ───────────────────────────────────────────────

import { TimeDilation } from '../TimeDilation';

describe('TimeDilation', () => {
  let td: TimeDilation;

  beforeEach(() => {
    td = new TimeDilation();
  });

  it('should return 1.0 scale by default', () => {
    expect(td.scale).toBe(1.0);
    expect(td.apply(0.016)).toBeCloseTo(0.016);
  });

  it('should slow time during dilation', () => {
    td.slowDown(0.5, 0.3); // 50% speed for 300ms
    const dilated = td.apply(0.016);
    expect(dilated).toBeCloseTo(0.008); // half speed
    expect(td.isActive).toBe(true);
  });

  it('should restore normal speed after duration', () => {
    td.slowDown(0.5, 0.1);
    td.update(0.15); // Past duration
    expect(td.isActive).toBe(false);
    expect(td.scale).toBeCloseTo(1.0);
  });

  it('should ease back to normal speed', () => {
    td.slowDown(0.3, 0.2);
    td.update(0.15); // 75% through — should be easing back
    expect(td.scale).toBeGreaterThan(0.3);
    expect(td.scale).toBeLessThan(1.0);
  });

  it('should support freeze (scale 0)', () => {
    td.freeze(0.1);
    expect(td.apply(0.016)).toBeCloseTo(0);
  });

  it('should override previous dilation', () => {
    td.slowDown(0.5, 1.0);
    td.slowDown(0.2, 0.5); // Override with slower
    expect(td.scale).toBeCloseTo(0.2);
  });
});

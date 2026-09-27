import {
  PANIC_TIMER_THRESHOLD,
  ONFIRE_COMBO_THRESHOLD,
  MINDBLOWN_PROGRESS_THRESHOLD,
} from '../mascotConfig';

describe('mascotConfig', () => {
  it('exports numeric constants', () => {
    expect(typeof PANIC_TIMER_THRESHOLD).toBe('number');
    expect(typeof ONFIRE_COMBO_THRESHOLD).toBe('number');
    expect(typeof MINDBLOWN_PROGRESS_THRESHOLD).toBe('number');
  });

  it('panic threshold is less than onfire combo (different scales)', () => {
    expect(PANIC_TIMER_THRESHOLD).toBeLessThan(60); // seconds
    expect(ONFIRE_COMBO_THRESHOLD).toBeGreaterThanOrEqual(3);
  });

  it('mindblown progress threshold is a high-but-valid percentage', () => {
    expect(MINDBLOWN_PROGRESS_THRESHOLD).toBeGreaterThan(0);
    expect(MINDBLOWN_PROGRESS_THRESHOLD).toBeLessThanOrEqual(100);
  });
});

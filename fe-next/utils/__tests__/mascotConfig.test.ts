import {
  PANIC_TIMER_THRESHOLD,
  ONFIRE_COMBO_THRESHOLD,
  FLEXING_SCORE_THRESHOLD,
  ENCOURAGING_SCORE_THRESHOLD,
  MINDBLOWN_PROGRESS_THRESHOLD,
} from '../mascotConfig';

describe('mascotConfig', () => {
  it('exports numeric constants', () => {
    expect(typeof PANIC_TIMER_THRESHOLD).toBe('number');
    expect(typeof ONFIRE_COMBO_THRESHOLD).toBe('number');
    expect(typeof FLEXING_SCORE_THRESHOLD).toBe('number');
    expect(typeof ENCOURAGING_SCORE_THRESHOLD).toBe('number');
    expect(typeof MINDBLOWN_PROGRESS_THRESHOLD).toBe('number');
  });

  it('panic threshold is less than onfire combo (different scales)', () => {
    expect(PANIC_TIMER_THRESHOLD).toBeLessThan(60); // seconds
    expect(ONFIRE_COMBO_THRESHOLD).toBeGreaterThanOrEqual(3);
  });

  it('score thresholds are fractions between 0 and 1', () => {
    expect(FLEXING_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(FLEXING_SCORE_THRESHOLD).toBeLessThanOrEqual(1);
    expect(ENCOURAGING_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(ENCOURAGING_SCORE_THRESHOLD).toBeLessThan(FLEXING_SCORE_THRESHOLD);
  });
});

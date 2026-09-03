import { describe, it, expect } from 'vitest';
import { formatTimeMMSS } from '../timeFormatting';

describe('formatTimeMMSS', () => {
  it('shouldFormatWholeSecondsAsMmSsWhenGivenAnInteger', () => {
    // GIVEN a whole number of remaining seconds
    // WHEN formatted for the countdown
    // THEN it is MM:SS with a padded seconds field
    expect(formatTimeMMSS(125)).toBe('2:05');
    expect(formatTimeMMSS(45)).toBe('0:45');
    expect(formatTimeMMSS(0)).toBe('0:00');
  });

  it('shouldHideFractionalSecondsWhenRemainingTimeIsAFloat', () => {
    // GIVEN a sub-second remaining value (high-res timers feed floats)
    // WHEN formatted for the countdown
    // THEN the display looks like a clock, not "1:29.7"
    expect(formatTimeMMSS(89.7)).toBe('1:29');
    expect(formatTimeMMSS(5.9)).toBe('0:05');
  });

  it('shouldClampNegativeRemainingTimeToZero', () => {
    // GIVEN a negative remaining value (late tick after game end)
    // WHEN formatted
    // THEN it shows 0:00 instead of "-1:-10"
    expect(formatTimeMMSS(-10)).toBe('0:00');
  });
});

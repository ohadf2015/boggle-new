import { describe, it, expect } from 'vitest';
import { shouldShowRetryCta } from '../practiceWheelRetryCta';

describe('shouldShowRetryCta', () => {
  it('retry-cta → true', () => {
    expect(shouldShowRetryCta('retry-cta')).toBe(true);
  });

  it('control → false', () => {
    expect(shouldShowRetryCta('control')).toBe(false);
  });

  it('unknown variant → false (safe default)', () => {
    // @ts-expect-error — guard against unexpected runtime variants
    expect(shouldShowRetryCta('unknown')).toBe(false);
  });
});

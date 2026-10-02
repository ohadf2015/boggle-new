import { describe, it, expect } from 'vitest';
import { TEACHER_PRO_TRIAL_DAYS } from '../trialDays';
import { POLAR_PRO_TRIAL_DAYS } from '@/lib/polar';

describe('trial length shown on the page is the length checkout grants', () => {
  it('shares one constant with the Polar checkout', () => {
    expect(POLAR_PRO_TRIAL_DAYS).toBe(TEACHER_PRO_TRIAL_DAYS);
  });
});

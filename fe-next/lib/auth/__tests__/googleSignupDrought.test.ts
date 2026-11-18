import { describe, expect, it } from 'vitest';
import { daytimeHoursEndingAt, shouldAlertGoogleSignupDrought } from '../googleSignupDrought';

describe('shouldAlertGoogleSignupDrought', () => {
  it('alerts when 8 daytime hours have 0 Google signups and the landing CTA was clicked', () => {
    expect(shouldAlertGoogleSignupDrought({
      googleSignups: 0,
      landingCtaClicked: 11,
      daytimeHours: 8,
    })).toBe(true);
  });

  it('stays quiet overnight, when Google still converts, or when nobody is clicking', () => {
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 0, landingCtaClicked: 40, daytimeHours: 7 })).toBe(false);
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 1, landingCtaClicked: 40, daytimeHours: 8 })).toBe(false);
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 0, landingCtaClicked: 10, daytimeHours: 8 })).toBe(false);
  });

  it('counts only Israel daytime hours in an 8-hour lookback', () => {
    // 18:00 Israel is 16:00 UTC. The previous 8 hours are 10:00–18:00 local, all daytime.
    expect(daytimeHoursEndingAt(new Date('2026-11-17T16:00:00Z'), 8)).toBe(8);
    // 08:00 Israel is 06:00 UTC. The previous 8 hours are 00:00–08:00 local, only the last hour is daytime.
    expect(daytimeHoursEndingAt(new Date('2026-11-17T06:00:00Z'), 8)).toBe(1);
  });
});

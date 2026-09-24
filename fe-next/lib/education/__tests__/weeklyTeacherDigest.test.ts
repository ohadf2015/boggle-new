import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildWeeklyTeacherDigest, POLAR_TRIAL_EXPIRED_DIGEST_KEY } from '../weeklyTeacherDigest';

const numbers = { played: 18, accuracyPct: 72, coveragePct: 40 };

describe('buildWeeklyTeacherDigest', () => {
  it('adds one reactivation line when the Polar trial expired and they are not Pro', () => {
    const digest = buildWeeklyTeacherDigest({ ...numbers, hasPro: false, polarTrialExpired: true });
    expect(digest.polarTrialExpiredLineKey).toBe(POLAR_TRIAL_EXPIRED_DIGEST_KEY);
    expect(digest.played).toBe(18);
    expect(digest.accuracyPct).toBe(72);
  });

  it('Pro teachers get the numbers and no upsell, including a converted trial', () => {
    expect(buildWeeklyTeacherDigest({ ...numbers, hasPro: true, polarTrialExpired: false }).polarTrialExpiredLineKey).toBeNull();
    expect(buildWeeklyTeacherDigest({ ...numbers, hasPro: true, polarTrialExpired: true }).polarTrialExpiredLineKey).toBeNull();
  });

  it('a free teacher who never trialed does not get the expired line', () => {
    expect(buildWeeklyTeacherDigest({ ...numbers, hasPro: false, polarTrialExpired: false }).polarTrialExpiredLineKey).toBeNull();
  });

  it('does not put the Polar CTA on the on-screen digest fold', () => {
    const fold = readFileSync(
      join(__dirname, '../../../components/teacher/digest/ProgressDigestDashboard.tsx'),
      'utf8',
    );
    expect(fold).not.toContain('polarTrialExpired');
    expect(fold).not.toContain('trialEndedCta');
    expect(fold).not.toContain('startTrial');
  });
});

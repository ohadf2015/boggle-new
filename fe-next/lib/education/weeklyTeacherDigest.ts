/**
 * Weekly teacher progress numbers for the email in
 * `lib/email/templates/teacherWeeklyProgressDigest.ts`.
 *
 * The Polar reactivation line is a key, not a sentence, so the template can
 * render it in the teacher's locale. Pro teachers get the numbers only.
 * The on-screen digest fold does not read this — its Pro lock is a different
 * ask, and the Polar CTA stays in the email.
 */

export const POLAR_TRIAL_EXPIRED_DIGEST_KEY = 'teacher.digest.polarTrialExpiredLine' as const;

export interface WeeklyTeacherDigestNumbers {
  played: number;
  accuracyPct: number | null;
  coveragePct: number | null;
}

export interface WeeklyTeacherDigest extends WeeklyTeacherDigestNumbers {
  /** Set only when a Polar Pro trial ended and the teacher is not Pro. */
  polarTrialExpiredLineKey: typeof POLAR_TRIAL_EXPIRED_DIGEST_KEY | null;
}

export function buildWeeklyTeacherDigest(
  input: WeeklyTeacherDigestNumbers & {
    hasPro: boolean;
    /** Polar trial ended and was not converted. Ignored while they are Pro. */
    polarTrialExpired: boolean;
  },
): WeeklyTeacherDigest {
  const upsell = input.polarTrialExpired && !input.hasPro;
  return {
    played: input.played,
    accuracyPct: input.accuracyPct,
    coveragePct: input.coveragePct,
    polarTrialExpiredLineKey: upsell ? POLAR_TRIAL_EXPIRED_DIGEST_KEY : null,
  };
}

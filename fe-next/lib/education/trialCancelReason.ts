export const TRIAL_CANCEL_REASONS = ['too_expensive', 'school_pays', 'just_testing', 'missing_feature'] as const;

export type TrialCancelReason = (typeof TRIAL_CANCEL_REASONS)[number];

const REASONS = new Set<string>(TRIAL_CANCEL_REASONS);

export function isTrialCancelReason(value: unknown): value is TrialCancelReason {
  return typeof value === 'string' && REASONS.has(value);
}

/**
 * Shared Teacher Pro cancel-retention helpers.
 *
 * Route files may export only HTTP handlers (see routeExports.guard). These
 * constants and the month-shift used by the retention offer live here so
 * `next build` does not fail on a stray route export.
 */

export const CANCEL_REASONS = ['too_expensive', 'school_pays', 'just_testing', 'missing_feature'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export function isCancelReason(value: unknown): value is CancelReason {
  return typeof value === 'string' && (CANCEL_REASONS as readonly string[]).includes(value);
}

export type RetentionOfferKind = 'pause' | 'discount';

/** `iso` + `months` in the UTC calendar, clamping day-of-month overflow (Jan 31 + 1mo → Feb 28). */
export function addMonthsUtc(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + months * 30 * 86_400_000).toISOString();
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString();
}

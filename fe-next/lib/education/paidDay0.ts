/**
 * Paid edu_access day-0 helpers. Pure so the landing, the nudge planner and
 * the trial-clock exclusion share one definition.
 */

export const PAID_MEDIUM = 'paid';
export const SHARE_CODE_AFTER_DAYS = 1;
export const PAID_SHARE_CODE_AFTER_DAYS = 0;
export const REHEARSAL_SEAT_CAP = 1;

export function isPaidMedium(utmMedium: string | null | undefined): boolean {
  return (utmMedium || '').trim().toLowerCase() === PAID_MEDIUM;
}

/** A paid campaign teacher. Role is checked by the caller when it has it. */
export function isPaidCampaignProfile(profile: { utm_medium?: string | null } | null | undefined): boolean {
  return isPaidMedium(profile?.utm_medium);
}

export function shareCodeDueAfterDays(paidDay0: boolean): number {
  return paidDay0 ? PAID_SHARE_CODE_AFTER_DAYS : SHARE_CODE_AFTER_DAYS;
}

/** One rehearsal seat per class. A later real student who copies the test link still counts. */
export function honorRehearsalJoin(requested: boolean, existingRehearsalSeats: number): boolean {
  return requested === true && existingRehearsalSeats < REHEARSAL_SEAT_CAP;
}

/** Players who count toward the e334c5c8 >=2-player trial clock. */
export function realClassPlayerIds(playerIds: readonly string[], rehearsalIds: ReadonlySet<string>): string[] {
  return playerIds.filter((id) => Boolean(id) && !rehearsalIds.has(id));
}

const CLASS_NAME: Record<string, string> = {
  en: 'My class',
  he: 'הכיתה שלי',
  es: 'Mi clase',
  sv: 'Min klass',
  ja: 'わたしのクラス',
  ru: 'Мой класс',
};

export function defaultClassName(locale: string | null | undefined): string {
  const key = (locale || 'en').toLowerCase().split('-')[0];
  return CLASS_NAME[key] ?? CLASS_NAME.en;
}

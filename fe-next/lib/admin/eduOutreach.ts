/**
 * Owner nudges to stuck teachers. The cooldown is what stops one teacher from being
 * chased daily; the server enforces it, the rescue list only mirrors it.
 */

export const OUTREACH_COOLDOWN_DAYS = 7;
export const OUTREACH_CHANNELS = ['copy', 'email', 'marked'] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

const DAY_MS = 86_400_000;

export function isOutreachCoolingDown(lastAtIso: string | null, nowMs: number): boolean {
  if (!lastAtIso) return false;
  const last = Date.parse(lastAtIso);
  return !Number.isNaN(last) && nowMs - last < OUTREACH_COOLDOWN_DAYS * DAY_MS;
}

export function teacherHomeUrl(origin: string, language: string): string {
  return `${origin}/${language}/teacher`;
}

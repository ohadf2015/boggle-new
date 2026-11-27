import type { HolidayKey } from './calendar';

export function missedDays(trackDays: readonly string[], lit: ReadonlySet<number>, today: string): number[] {
  return trackDays.flatMap((d, i) => (d < today && !lit.has(i) ? [i] : []));
}

export function latestMissedDay(trackDays: readonly string[], lit: ReadonlySet<number>, today: string): number | null {
  const missed = missedDays(trackDays, lit, today);
  return missed.length ? missed[missed.length - 1] : null;
}

export function rescueInviteUrl(origin: string, locale: string, holiday: HolidayKey, code: string): string {
  const q = new URLSearchParams({ holiday, ref: code, hinvite: '1' });
  return `${origin}/${locale}/daily?${q.toString()}`;
}

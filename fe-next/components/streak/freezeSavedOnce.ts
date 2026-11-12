import { claimOnce, freezeToastKey } from '@/lib/daily/streakToastOnce';

/** The server always spends a freeze on yesterday (UTC), which is also the date the home moment keys on. */
export function bridgedDay(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Same marker as the home "freeze saved your streak" moment: true only for the first surface to show this save. */
export function claimFreezeSaved(playerId: string | null | undefined, date: string = bridgedDay()): boolean {
  return claimOnce(freezeToastKey(playerId ?? 'guest', date));
}

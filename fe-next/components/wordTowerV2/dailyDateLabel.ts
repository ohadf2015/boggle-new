import { utcDateKey } from '@/lib/wordTower/dailySeed';

/** Today's UTC date as a short local label ("27 Oct"), the day the daily seed belongs to. */
export function dailyDateLabel(language: string, key: string = utcDateKey()): string {
  const [y, m, d] = key.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : `${language}-${language.toUpperCase()}`, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return formatter.format(new Date(Date.UTC(y, m - 1, d)));
}

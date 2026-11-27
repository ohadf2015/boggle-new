import { HOLIDAY_KEYS, windowFor, type HolidayKey, type HolidayWindow } from './calendar';
import { isPlausibleLocalDate } from '@/lib/holidayEvent/progress.server';
import { eventKeyFor } from '@/lib/holidayEvent/rewards';

export const HOLIDAY_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

export function holidayLocale(v: unknown): string {
  return typeof v === 'string' && (HOLIDAY_LOCALES as readonly string[]).includes(v.slice(0, 2)) ? v.slice(0, 2) : 'en';
}

export interface HolidayInput {
  holiday: HolidayKey;
  localDate: string;
  locale: string;
  win: HolidayWindow;
  eventKey: string;
}

export function parseHolidayInput(
  raw: { holiday?: unknown; localDate?: unknown; locale?: unknown } | null | undefined,
  now: Date = new Date(),
): HolidayInput | null {
  const { holiday, localDate, locale } = raw ?? {};
  if (typeof holiday !== 'string' || !(HOLIDAY_KEYS as readonly string[]).includes(holiday)) return null;
  if (typeof localDate !== 'string' || !isPlausibleLocalDate(localDate, now)) return null;
  const l = holidayLocale(locale);
  const win = windowFor(holiday as HolidayKey, localDate, l);
  if (!win) return null;
  return { holiday: holiday as HolidayKey, localDate, locale: l, win, eventKey: eventKeyFor(win) };
}

export function inputFromSearch(url: string): HolidayInput | null {
  const p = new URL(url).searchParams;
  return parseHolidayInput({ holiday: p.get('holiday'), localDate: p.get('localDate'), locale: p.get('locale') });
}

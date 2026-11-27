export type HolidayKey = 'hanukkah' | 'christmas';
export type HolidayPhase = 'off' | 'preview' | 'live';

export interface HolidayWindow {
  key: HolidayKey;
  previewStart: string;
  start: string;
  end: string;
  trackDays: string[];
  finale: string;
}

export const HOLIDAY_KEYS: readonly HolidayKey[] = ['hanukkah', 'christmas'];

const HANUKKAH_START: Record<number, string> = {
  2026: '2026-12-04',
  2027: '2027-12-24',
  2028: '2028-12-12',
};

const HANUKKAH_NIGHTS = 8;
const CHRISTMAS_GIFTS = 12;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CHRISTMAS_END: Record<string, string> = { es: '01-07', ru: '01-07' };
const CHRISTMAS_FINALE: Record<string, string> = { es: '01-06' };
export const CHRISTMAS_LOCALES = Object.keys(CHRISTMAS_END);

function lang(locale?: string | null): string {
  return (locale ?? '').slice(0, 2).toLowerCase();
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function days(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

function previewStart(year: number, start: string): string {
  const dec1 = `${year}-12-01`;
  return start < dec1 ? start : dec1;
}

export function holidayWindows(year: number, locale?: string | null): HolidayWindow[] {
  const l = lang(locale);
  const out: HolidayWindow[] = [];
  const hStart = HANUKKAH_START[year];
  if (hStart) {
    const trackDays = days(hStart, HANUKKAH_NIGHTS);
    out.push({ key: 'hanukkah', previewStart: previewStart(year, hStart), start: hStart, end: addDays(hStart, HANUKKAH_NIGHTS), trackDays, finale: trackDays[HANUKKAH_NIGHTS - 1] });
  }
  out.push({
    key: 'christmas',
    previewStart: `${year}-12-01`,
    start: `${year}-12-13`,
    end: `${year + 1}-${CHRISTMAS_END[l] ?? '01-01'}`,
    trackDays: days(`${year}-12-14`, CHRISTMAS_GIFTS),
    finale: CHRISTMAS_FINALE[l] ? `${year + 1}-${CHRISTMAS_FINALE[l]}` : `${year}-12-25`,
  });
  return out;
}

function findWindow(key: HolidayKey, localDate: string, locale: string | null | undefined, from: 'start' | 'previewStart'): HolidayWindow | null {
  if (!DATE_RE.test(localDate)) return null;
  const year = Number(localDate.slice(0, 4));
  for (const y of [year - 1, year]) {
    const win = holidayWindows(y, locale).find((w) => w.key === key);
    if (win && localDate >= win[from] && localDate <= win.end) return win;
  }
  return null;
}

export function windowFor(key: HolidayKey, localDate: string, locale?: string | null): HolidayWindow | null {
  return findWindow(key, localDate, locale, 'start');
}

export function previewWindowFor(key: HolidayKey, localDate: string, locale?: string | null): HolidayWindow | null {
  return findWindow(key, localDate, locale, 'previewStart');
}

export function holidayPhase(key: HolidayKey, localDate: string, locale?: string | null): HolidayPhase {
  if (windowFor(key, localDate, locale)) return 'live';
  return previewWindowFor(key, localDate, locale) ? 'preview' : 'off';
}

export function trackIndex(win: HolidayWindow, localDate: string): number | null {
  const i = win.trackDays.indexOf(localDate);
  return i < 0 ? null : i;
}

export function daysUntilTrack(win: HolidayWindow, localDate: string): number | null {
  const first = win.trackDays[0];
  if (!first || localDate >= first) return null;
  return Math.round((Date.parse(first) - Date.parse(localDate)) / 86_400_000);
}

export function finaleDate(win: HolidayWindow): string {
  return win.finale;
}

export function localDateIn(now: Date, timeZone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function formatHolidayDay(date: string, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

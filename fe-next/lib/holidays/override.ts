import { HOLIDAY_KEYS, type HolidayKey } from './calendar';

export const HOLIDAY_COOKIE = 'lx_holiday';
export const HOLIDAY_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;
export const HOLIDAY_CLASS_PREFIX = 'holiday-';

export function parseOverride(v: string | null | undefined): HolidayKey | null {
  return v && (HOLIDAY_KEYS as readonly string[]).includes(v) ? (v as HolidayKey) : null;
}

export function readOverrideCookie(cookie: string): HolidayKey | null {
  const m = cookie.match(new RegExp(`(?:^|; )${HOLIDAY_COOKIE}=([^;]+)`));
  return parseOverride(m?.[1]);
}

export function holidayCookie(v: HolidayKey): string {
  return `${HOLIDAY_COOKIE}=${v}; path=/; max-age=${HOLIDAY_COOKIE_MAX_AGE}; samesite=lax`;
}

export function holidayClass(key: HolidayKey): string {
  return `${HOLIDAY_CLASS_PREFIX}${key}`;
}

export function liveHolidayIn(classList: DOMTokenList): HolidayKey | null {
  if (!classList.contains('holiday-live')) return null;
  return HOLIDAY_KEYS.find((k) => classList.contains(holidayClass(k))) ?? null;
}

import { HOLIDAY_KEYS, type HolidayKey } from './calendar';
import type { HolidayOverride } from './region';

export const HOLIDAY_COOKIE = 'lx_holiday';
export const HOLIDAY_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;
export const HOLIDAY_CLASS_PREFIX = 'holiday-';

const VALUES: readonly HolidayOverride[] = ['hanukkah', 'christmas', 'off'];

export function parseOverride(v: string | null | undefined): HolidayOverride | null {
  return v && (VALUES as readonly string[]).includes(v) ? (v as HolidayOverride) : null;
}

export function readOverrideCookie(cookie: string): HolidayOverride | null {
  const m = cookie.match(new RegExp(`(?:^|; )${HOLIDAY_COOKIE}=([^;]+)`));
  return parseOverride(m?.[1]);
}

export function holidayCookie(v: HolidayOverride): string {
  return `${HOLIDAY_COOKIE}=${v}; path=/; max-age=${HOLIDAY_COOKIE_MAX_AGE}; samesite=lax`;
}

export function holidayClass(key: HolidayKey): string {
  return `${HOLIDAY_CLASS_PREFIX}${key}`;
}

export function liveHolidayIn(classList: DOMTokenList): HolidayKey | null {
  if (!classList.contains('holiday-live')) return null;
  return HOLIDAY_KEYS.find((k) => classList.contains(holidayClass(k))) ?? null;
}

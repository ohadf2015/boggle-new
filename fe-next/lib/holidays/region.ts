import { previewWindowFor, type HolidayKey } from './calendar';

export type HolidayRegion = 'IL' | 'world';

const IL_TIME_ZONES = new Set(['Asia/Jerusalem', 'Asia/Tel_Aviv']);

export function resolveRegion(i: { countryCode?: string | null; timeZone?: string | null; locale?: string | null }): HolidayRegion {
  if (i.countryCode) return i.countryCode.toUpperCase() === 'IL' ? 'IL' : 'world';
  if (i.timeZone && IL_TIME_ZONES.has(i.timeZone)) return 'IL';
  if (i.locale && /^he\b/i.test(i.locale)) return 'IL';
  return 'world';
}

export function defaultHoliday(region: HolidayRegion): HolidayKey {
  return region === 'IL' ? 'hanukkah' : 'christmas';
}

export function otherHoliday(key: HolidayKey): HolidayKey {
  return key === 'hanukkah' ? 'christmas' : 'hanukkah';
}

export function activeHoliday(i: {
  localDate: string;
  region: HolidayRegion;
  override?: HolidayKey | null;
  preview?: boolean;
  locale?: string | null;
}): HolidayKey | null {
  if (i.override && (i.preview || previewWindowFor(i.override, i.localDate, i.locale))) return i.override;
  const key = defaultHoliday(i.region);
  return previewWindowFor(key, i.localDate, i.locale) ? key : null;
}

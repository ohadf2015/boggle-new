import type { HolidayKey } from '@/lib/holidays/calendar';
import { holidayForProfile, type HolidayAudienceProfile } from '@/lib/holidayGreetingEmail';

export interface HolidayCampaign {
  id: string;
  holiday: HolidayKey;
  date: string;
}

export const HOLIDAY_CAMPAIGNS: readonly HolidayCampaign[] = [
  { id: 'hanukkah-2026', holiday: 'hanukkah', date: '2026-12-04' },
  { id: 'christmas-2026', holiday: 'christmas', date: '2026-12-18' },
];

const SEND_FROM_HOUR = 10;
const SEND_UNTIL_HOUR = 13;
const HOUR_MS = 3_600_000;
// Local 10:00 at UTC+14 is 20:00 UTC the day before; local 13:59 at UTC-12 is 01:59 UTC the day after.
const EARLIEST_OFFSET_MS = -4 * HOUR_MS;
const LATEST_OFFSET_MS = 26 * HOUR_MS;

const COUNTRY_TIME_ZONE: Record<string, string> = {
  IL: 'Asia/Jerusalem',
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  SE: 'Europe/Stockholm',
  ES: 'Europe/Madrid',
  MX: 'America/Mexico_City',
  AR: 'America/Argentina/Buenos_Aires',
  CO: 'America/Bogota',
  CL: 'America/Santiago',
  PE: 'America/Lima',
  JP: 'Asia/Tokyo',
  RU: 'Europe/Moscow',
  AU: 'Australia/Sydney',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  IN: 'Asia/Kolkata',
  BR: 'America/Sao_Paulo',
};

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function recipientTimeZone(p: HolidayAudienceProfile): string {
  if (p.timezone && isValidTimeZone(p.timezone)) return p.timezone;
  return COUNTRY_TIME_ZONE[p.country_code?.toUpperCase() ?? ''] ?? 'UTC';
}

function localDateHour(tz: string, now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

export function activeCampaigns(now: Date): HolidayCampaign[] {
  return HOLIDAY_CAMPAIGNS.filter((c) => {
    const dayStart = Date.parse(`${c.date}T00:00:00Z`);
    const t = now.getTime();
    return t >= dayStart + EARLIEST_OFFSET_MS && t < dayStart + LATEST_OFFSET_MS;
  });
}

export function isDueNow(campaign: HolidayCampaign, p: HolidayAudienceProfile, now: Date): boolean {
  if (holidayForProfile(p) !== campaign.holiday) return false;
  const local = localDateHour(recipientTimeZone(p), now);
  return local.date === campaign.date && local.hour >= SEND_FROM_HOUR && local.hour <= SEND_UNTIL_HOUR;
}

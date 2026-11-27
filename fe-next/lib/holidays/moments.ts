import type { HolidayKey } from './calendar';

export type HolidayMoment =
  | 'lucia' | 'fika' | 'inocentes' | 'reyes' | 'roscon' | 'kohaku'
  | 'bells108' | 'chimes' | 'dedmoroz' | 'sleigh' | 'boxingDay';

const BOXING_COUNTRIES = new Set(['GB', 'CA', 'AU']);
const CA_ZONES = new Set([
  'America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax',
  'America/St_Johns', 'America/Regina', 'America/Montreal', 'America/Moncton', 'America/Whitehorse',
]);

export function countryFromTimeZone(tz: string | null | undefined): string | null {
  if (!tz) return null;
  if (tz === 'Europe/London' || tz === 'Europe/Belfast') return 'GB';
  if (CA_ZONES.has(tz)) return 'CA';
  if (tz.startsWith('Australia/')) return 'AU';
  return null;
}

export interface MomentInput {
  holiday: HolidayKey | null;
  locale: string;
  localDate: string;
  hour: number;
  countryCode?: string | null;
  timeZone?: string | null;
}

export function momentsFor(i: MomentInput): HolidayMoment[] {
  if (i.holiday !== 'christmas') return [];
  const l = i.locale.slice(0, 2).toLowerCase();
  const md = i.localDate.slice(5);
  const out: HolidayMoment[] = [];
  const on = (cond: boolean, m: HolidayMoment) => cond && out.push(m);
  on(l === 'sv' && md === '12-13', 'lucia');
  on(l === 'sv' && md === '12-24' && i.hour === 15, 'fika');
  on(l === 'es' && md === '12-28', 'inocentes');
  on(l === 'es' && (md === '01-05' || md === '01-06'), 'reyes');
  on(l === 'es' && md === '01-06', 'roscon');
  on(l === 'ja' && md === '12-31', 'kohaku');
  on(l === 'ja' && (md === '12-31' || md === '01-01'), 'bells108');
  on(l === 'ru' && ((md === '12-31' && i.hour >= 23) || (md === '01-01' && i.hour < 1)), 'chimes');
  on(l === 'ru' && (md === '12-31' || (md >= '01-01' && md <= '01-07')), 'dedmoroz');
  on(l === 'en' && md === '12-24', 'sleigh');
  const country = (i.countryCode || countryFromTimeZone(i.timeZone) || '').toUpperCase();
  on(md === '12-26' && BOXING_COUNTRIES.has(country), 'boxingDay');
  return out;
}

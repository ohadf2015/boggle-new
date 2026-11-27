import { HOLIDAY_KEYS, localDateIn, windowFor, type HolidayKey } from './calendar';
import { holidayClass, holidayCookie, readOverrideCookie } from './override';
import { activeHoliday, resolveRegion, type HolidayOverride, type HolidayRegion } from './region';

export interface HolidayDomState {
  holiday: HolidayKey | null;
  region: HolidayRegion;
  available: HolidayKey[];
}

let state: HolidayDomState | null = null;
const listeners = new Set<() => void>();

const html = () => document.documentElement;
const today = () => localDateIn(new Date());
const isPreview = () => html().getAttribute('data-holiday-preview') === '1';
const locale = () => html().lang;

function guessedRegion(): HolidayRegion {
  const attr = html().getAttribute('data-holiday-region');
  if (attr === 'IL' || attr === 'world') return attr;
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  return resolveRegion({ timeZone, locale: html().lang });
}

function openToday(): HolidayKey[] {
  const date = today();
  return HOLIDAY_KEYS.filter((k) => windowFor(k, date, locale()));
}

function commit(next: HolidayDomState) {
  state = next;
  const cl = html().classList;
  for (const k of HOLIDAY_KEYS) cl.toggle(holidayClass(k), k === next.holiday);
  listeners.forEach((l) => l());
}

export function getHolidayState(): HolidayDomState {
  if (!state) {
    const cl = html().classList;
    state = {
      holiday: HOLIDAY_KEYS.find((k) => cl.contains(holidayClass(k))) ?? null,
      region: guessedRegion(),
      available: openToday(),
    };
  }
  return state;
}

export function subscribeHoliday(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function refineHolidayRegion(region: HolidayRegion) {
  const cur = getHolidayState();
  if (cur.region === region) return;
  const override = readOverrideCookie(document.cookie);
  commit({ ...cur, region, holiday: activeHoliday({ localDate: today(), region, override, preview: isPreview(), locale: locale() }) });
}

export function applyHolidayOverride(override: HolidayOverride) {
  const cur = getHolidayState();
  document.cookie = holidayCookie(override);
  commit({ ...cur, holiday: activeHoliday({ localDate: today(), region: cur.region, override, preview: isPreview(), locale: locale() }) });
}

export function keepHolidayClass(): () => void {
  getHolidayState();
  const observer = new MutationObserver(() => {
    const key = getHolidayState().holiday;
    if (key && !html().classList.contains(holidayClass(key))) html().classList.add(holidayClass(key));
  });
  observer.observe(html(), { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

export function __resetHolidayStore() {
  state = null;
  listeners.clear();
}

import { HOLIDAY_KEYS, holidayPhase, localDateIn, type HolidayKey, type HolidayPhase } from './calendar';
import { holidayClass, holidayCookie, readOverrideCookie } from './override';
import { activeHoliday, resolveRegion, type HolidayRegion } from './region';

export interface HolidayDomState {
  holiday: HolidayKey | null;
  phase: HolidayPhase;
  region: HolidayRegion;
  available: HolidayKey[];
  override: HolidayKey | null;
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

const PHASE_CLASS = { preview: 'holiday-preview', live: 'holiday-live' } as const;

function openToday(): HolidayKey[] {
  const date = today();
  return HOLIDAY_KEYS.filter((k) => holidayPhase(k, date, locale()) !== 'off');
}

function phaseOf(key: HolidayKey | null): HolidayPhase {
  if (!key) return 'off';
  return isPreview() ? 'live' : holidayPhase(key, today(), locale());
}

function applyClasses(next: Pick<HolidayDomState, 'holiday' | 'phase'>) {
  const cl = html().classList;
  for (const k of HOLIDAY_KEYS) cl.toggle(holidayClass(k), k === next.holiday);
  cl.toggle(PHASE_CLASS.preview, next.phase === 'preview');
  cl.toggle(PHASE_CLASS.live, next.phase === 'live');
}

function commit(next: Omit<HolidayDomState, 'phase'>) {
  state = { ...next, phase: phaseOf(next.holiday) };
  applyClasses(state);
  listeners.forEach((l) => l());
}

export function getHolidayState(): HolidayDomState {
  if (!state) {
    const cl = html().classList;
    const holiday = HOLIDAY_KEYS.find((k) => cl.contains(holidayClass(k))) ?? null;
    state = {
      holiday,
      phase: !holiday ? 'off' : cl.contains(PHASE_CLASS.preview) ? 'preview' : 'live',
      region: guessedRegion(),
      available: openToday(),
      override: readOverrideCookie(document.cookie),
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
  commit({ ...cur, region, override, holiday: activeHoliday({ localDate: today(), region, override, preview: isPreview(), locale: locale() }) });
}

export function applyHolidayOverride(override: HolidayKey) {
  const cur = getHolidayState();
  document.cookie = holidayCookie(override);
  commit({ ...cur, override, holiday: activeHoliday({ localDate: today(), region: cur.region, override, preview: isPreview(), locale: locale() }) });
}

export function keepHolidayClass(): () => void {
  getHolidayState();
  const observer = new MutationObserver(() => {
    const cur = getHolidayState();
    if (!cur.holiday) return;
    const cl = html().classList;
    const phaseClass = cur.phase === 'preview' ? PHASE_CLASS.preview : PHASE_CLASS.live;
    if (!cl.contains(holidayClass(cur.holiday)) || !cl.contains(phaseClass)) applyClasses(cur);
  });
  observer.observe(html(), { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

export function __resetHolidayStore() {
  state = null;
  listeners.clear();
}

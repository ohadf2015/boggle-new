import { HOLIDAY_PROGRESS_EVENT } from '@/lib/holidayEvent/markHolidayPlayed';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { localDateIn, type HolidayKey } from './calendar';
import { matchSecretWord } from './eggs';
import { liveHolidayIn } from './override';

export const HOLIDAY_EGG_EVENT = 'lc:holiday-egg';
export const HOLIDAY_HUNT_EVENT = 'lc:holiday-hunt';

export interface HolidayQuery {
  holiday: HolidayKey;
  localDate: string;
  locale: string;
}

export interface HuntClientState {
  slot: string;
  item: string;
  foundToday: boolean;
  count: number;
  goal: number;
  seeker: boolean;
}

export function holidayQuery(): HolidayQuery | null {
  if (typeof document === 'undefined') return null;
  const holiday = liveHolidayIn(document.documentElement.classList);
  if (!holiday) return null;
  return { holiday, localDate: localDateIn(new Date()), locale: (document.documentElement.lang || 'en').slice(0, 2) };
}

export function holidayQs(q: HolidayQuery): string {
  return `holiday=${q.holiday}&localDate=${q.localDate}&locale=${q.locale}`;
}

export async function holidayGet<T>(path: string, q: HolidayQuery): Promise<T> {
  const res = await fetch(`/api/holiday/${path}?${holidayQs(q)}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function holidayPost<T>(path: string, q: HolidayQuery, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/holiday/${path}`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...q, ...extra }),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

const noticed = new Set<string>();

export function recordHolidayEgg(egg: string): void {
  const q = holidayQuery();
  if (!q || !hasSupabaseSession()) return;
  void holidayPost('eggs', q, { egg }).catch(() => undefined);
}

export function celebrateHolidayEgg(egg: string): void {
  if (noticed.has(egg)) return;
  noticed.add(egg);
  window.dispatchEvent(new CustomEvent(HOLIDAY_EGG_EVENT, { detail: { egg } }));
  recordHolidayEgg(egg);
}

export function noticeHolidayWord(word: string): void {
  const q = holidayQuery();
  if (!q) return;
  const egg = matchSecretWord(word, q.locale, q.holiday);
  if (egg) celebrateHolidayEgg(egg);
}

export async function noteHolidayGame(words: number): Promise<void> {
  const q = holidayQuery();
  if (!q || !hasSupabaseSession()) return;
  try {
    const res = await holidayPost<{ comeback?: { index: number; reward: unknown } }>('game', q, { words });
    if (res.comeback) {
      window.dispatchEvent(new CustomEvent(HOLIDAY_PROGRESS_EVENT, { detail: { status: 'lit', ...res.comeback, comeback: true } }));
    }
  } catch {
    // A missed count only delays the comeback; the next game counts again.
  }
}

let hunt: { key: string; p: Promise<HuntClientState | null> } | null = null;

export function loadHunt(): Promise<HuntClientState | null> {
  const q = holidayQuery();
  if (!q || !hasSupabaseSession()) return Promise.resolve(null);
  const key = holidayQs(q);
  if (hunt?.key === key) return hunt.p;
  const p = holidayGet<HuntClientState>('hunt', q).catch(() => {
    if (hunt?.key === key) hunt = null;
    return null;
  });
  hunt = { key, p };
  return p;
}

export function setHuntState(state: HuntClientState): void {
  const q = holidayQuery();
  if (!q) return;
  hunt = { key: holidayQs(q), p: Promise.resolve(state) };
  window.dispatchEvent(new CustomEvent(HOLIDAY_HUNT_EVENT, { detail: state }));
}

export function resetHolidayClientForTests(): void {
  noticed.clear();
  hunt = null;
}

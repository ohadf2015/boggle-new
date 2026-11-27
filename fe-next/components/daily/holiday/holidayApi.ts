import { localDateIn, type HolidayKey } from '@/lib/holidays/calendar';

export const todayLocal = () => localDateIn(new Date());
const pageLocale = () => (typeof document === 'undefined' ? '' : document.documentElement.lang);
const at = () => `localDate=${todayLocal()}&locale=${encodeURIComponent(pageLocale())}`;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

const post = <T,>(url: string, body: unknown) => call<T>(url, { method: 'POST', body: JSON.stringify(body) });

export const holidayApi = {
  spin: (kind: 'dreidel' | 'cracker', puzzleDate: string) => post<SpinResponse>('/api/holiday/spin', { kind, puzzleDate }),
  table: (holiday: HolidayKey) => call<{ table: TableView | null }>(`/api/holiday/table?holiday=${holiday}&${at()}`),
  tableAction: (action: 'create' | 'join' | 'leave', body: { holiday?: HolidayKey; code?: string }) =>
    post<TableActionResponse>('/api/holiday/table', { action, localDate: todayLocal(), locale: pageLocale(), ...body }),
  rescueState: (holiday: HolidayKey) => call<{ rescue: RescueView | null }>(`/api/holiday/rescue?holiday=${holiday}&${at()}`),
  rescue: (ref: string, holiday: HolidayKey) => post<{ status: string; day?: number }>('/api/holiday/rescue', { ref, holiday, localDate: todayLocal(), locale: pageLocale() }),
  community: (holiday: HolidayKey) => call<{ count: number | null }>(`/api/holiday/community?holiday=${holiday}&${at()}`),
  referralCode: () => call<{ referralCode?: string | null }>('/api/growth/referral'),
};

export type SpinResponse =
  | { status: 'not_played' | 'locked' }
  | { status: 'spun' | 'already'; face: 'nun' | 'gimel' | 'hei' | 'shin'; coins: number }
  | { status: 'pulled' | 'already'; joke: number; coins: number };

export type TableActionResponse = { status: 'ok'; code: string; holiday: HolidayKey } | { status: 'closed' | 'not_found' | 'full' | 'in_other_table' };

export interface TableView {
  code: string;
  holiday: HolidayKey;
  isOwner: boolean;
  board: { goal: number; nights: Array<{ date: string; total: number; lit: boolean }>; today: { date: string; total: number } };
  members: Array<{ userId: string; name: string | null; avatarEmoji: string | null; total: number; rank: number; playedToday: boolean; isYou: boolean }>;
}

export interface RescueView {
  code: string | null;
  missedDay: number | null;
  missedCount: number;
  rescuedDays: number[];
}

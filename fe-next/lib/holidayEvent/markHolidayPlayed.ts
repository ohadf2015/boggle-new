import { localDateIn, type HolidayKey } from '@/lib/holidays/calendar';
import { liveHolidayIn } from '@/lib/holidays/override';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import type { HolidayDayReward } from './rewards';

export const HOLIDAY_PROGRESS_EVENT = 'lc:holiday-progress';

export interface LitResult {
  status: 'lit';
  index: number;
  reward: HolidayDayReward;
}

const sent = new Set<string>();
let lastLit: LitResult | null = null;

/** The reward a finished game just earned, handed once to the card that shows it. */
export function consumeLastLit(): LitResult | null {
  const r = lastLit;
  lastLit = null;
  return r;
}

function themedHoliday(): HolidayKey | null {
  return liveHolidayIn(document.documentElement.classList);
}

export async function markHolidayPlayed(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const holiday = themedHoliday();
  if (!holiday || !hasSupabaseSession()) return;
  const localDate = localDateIn(new Date());
  const key = `${holiday}|${localDate}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    const res = await fetch('/api/holiday/progress', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holiday, localDate, locale: document.documentElement.lang }),
    });
    if (!res.ok) {
      sent.delete(key);
      return;
    }
    const detail = await res.json();
    if (detail?.status === 'lit') lastLit = detail as LitResult;
    window.dispatchEvent(new CustomEvent(HOLIDAY_PROGRESS_EVENT, { detail }));
  } catch {
    sent.delete(key);
  }
}

export function resetHolidayPlayedForTests(): void {
  sent.clear();
  lastLit = null;
}

export function rememberLitForTests(r: LitResult): void {
  lastLit = r;
}

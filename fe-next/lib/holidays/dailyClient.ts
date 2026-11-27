import type { HolidayKey } from './calendar';
import type { HolidaySettlement } from './dailyBonus.server';
import { liveHolidayIn } from './override';

export type { HolidaySettlement };

export interface HolidaySubmitState {
  submitted: boolean;
  settlement: HolidaySettlement | null;
}

const EMPTY: HolidaySubmitState = { submitted: false, settlement: null };
let state: HolidaySubmitState = EMPTY;
const listeners = new Set<() => void>();

export function themedHolidayNow(): HolidayKey | null {
  if (typeof document === 'undefined') return null;
  return liveHolidayIn(document.documentElement.classList);
}

export function publishHolidaySettlement(s: unknown): void {
  const valid = !!s && typeof s === 'object' && 'kind' in s;
  state = { submitted: true, settlement: valid ? (s as HolidaySettlement) : null };
  listeners.forEach((l) => l());
}

export function publishHolidayFromResponse(response: Response): void {
  Promise.resolve()
    .then(() => response.clone().json())
    .then((body: { holiday?: unknown } | null) => publishHolidaySettlement(body?.holiday))
    .catch(() => {});
}

export function getHolidaySubmitState(): HolidaySubmitState {
  return state;
}

export function getEmptyHolidaySubmitState(): HolidaySubmitState {
  return EMPTY;
}

export function subscribeHolidaySettlement(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function resetHolidaySettlementForTests(): void {
  state = EMPTY;
  listeners.clear();
}

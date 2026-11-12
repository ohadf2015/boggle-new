import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { isDayPrizeResponse, type DayPrizeClaimResponse, type DayPrizeKind } from '@/lib/daily/dayPrize';
import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { publishLevelUp } from '@/lib/avatar/revealTrigger';

/**
 * Per-device memory for the daily prize box: whether the box already popped up
 * on a results screen today (so it pops once), and the prize it held once
 * opened (so the hub shows it without asking the server again).
 */

const shownKey = (kind: DayPrizeKind, date: string) => `lc:day-prize-shown:${kind}:${date}`;
const openedKey = (kind: DayPrizeKind, date: string) => `lc:day-prize:${kind}:${date}`;

/** Boxes on screen right now; some results screens mount the CTA twice. */
const onScreen = new Set<DayPrizeKind>();

export function claimPopupSlot(kind: DayPrizeKind, date: string = getDailyChallengeDate()): boolean {
  if (onScreen.has(kind)) return false;
  try {
    // One chest a day: once either box is open, neither pops again.
    if (localStorage.getItem(shownKey(kind, date)) || localStorage.getItem(openedKey('clear', date)) || localStorage.getItem(openedKey('perfect', date))) return false;
    localStorage.setItem(shownKey(kind, date), '1');
  } catch {
    // storage off: still pop once per mount
  }
  onScreen.add(kind);
  return true;
}

export function releasePopupSlot(kind: DayPrizeKind): void {
  onScreen.delete(kind);
}

export function readOpenedPrize(kind: DayPrizeKind, date: string = getDailyChallengeDate()): DayPrizeClaimResponse | null {
  try {
    const raw = localStorage.getItem(openedKey(kind, date));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDayPrizeResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberOpenedPrize(prize: DayPrizeClaimResponse, date: string = getDailyChallengeDate()): void {
  try {
    localStorage.setItem(openedKey(prize.kind, date), JSON.stringify(prize));
  } catch {
    // storage off: the hub asks the server again, which answers with the same prize
  }
}

export type ClaimOutcome =
  | { ok: true; prize: DayPrizeClaimResponse }
  | { ok: false; reason: 'not-cleared' | 'opened' | 'failed' };

const ROUTES: Record<DayPrizeKind, string> = {
  clear: '/api/daily/day-clear/claim',
  perfect: '/api/daily/all-clear/claim',
};

/** Opens the box on the server. Safe to repeat: an opened box answers with the same prize and pays nothing. */
export async function claimDayPrize(kind: DayPrizeKind): Promise<ClaimOutcome> {
  try {
    const res = await postWithAuth(ROUTES[kind]);
    if (res.status === 400) return { ok: false, reason: 'not-cleared' };
    // Today's chest was already opened as the other box (on another device, say).
    if (res.status === 409) return { ok: false, reason: 'opened' };
    if (!res.ok) return { ok: false, reason: 'failed' };
    const body: unknown = await res.json();
    if (!isDayPrizeResponse(body)) return { ok: false, reason: 'failed' };
    rememberOpenedPrize(body);
    if (body.levelUp) publishLevelUp(body.levelUp, 'dailyPrize');
    return { ok: true, prize: body };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Whether this player's box is the education side's fixed prize. null when the
 * server could not say: the box then behaves as the random one until the
 * claim answers (the claim itself is what the server enforces).
 */
export async function fetchDayPrizeFixed(kind: DayPrizeKind): Promise<boolean | null> {
  try {
    const res = await getWithAuth(ROUTES[kind]);
    if (!res.ok) return null;
    const body = (await res.json()) as { fixed?: unknown };
    return typeof body?.fixed === 'boolean' ? body.fixed : null;
  } catch {
    return null;
  }
}

/**
 * Today's chest as the server knows it: the opened prize (remembered on this
 * device too), null when it is still shut, undefined when the server could not
 * say. Lets a chest opened on another device, or before a reload, show as open.
 */
export async function fetchOpenedToday(): Promise<DayPrizeClaimResponse | null | undefined> {
  try {
    const res = await getWithAuth(ROUTES.clear);
    if (!res.ok) return undefined;
    const body = (await res.json()) as { opened?: unknown };
    if (body?.opened === null || body?.opened === undefined) return null;
    if (!isDayPrizeResponse(body.opened)) return undefined;
    rememberOpenedPrize(body.opened);
    return body.opened;
  } catch {
    return undefined;
  }
}

import { createHmac, timingSafeEqual } from 'crypto';
import { billingPortalLocale, isPolarHostedUrl, polarPaymentUpdateUrl } from '@/lib/education/billingPortal';

export { isPolarHostedUrl, polarPaymentUpdateUrl };

/**
 * Grace-day dunning for the one paying Teacher Pro subscription.
 *
 * The webhook email is day 0. This module decides the follow-ups: day 1, then
 * a day-5 escalation. A missed cron still catches up through day 14, which is
 * how a teacher already 9 days past_due still gets the escalation once.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DUNNING_CATCHUP_MAX_DAY = 14;
export const DUNNING_RECOVER_TTL_MS = 10 * DAY_MS;
const SITE = 'https://www.lexiclash.live';
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DunningDay = 1 | 5;

export interface DunningRecoverPayload {
  userId: string;
  day: DunningDay;
  exp: number;
}

/** Earlier of the past_due event and the rolled-forward period end. Same rule as proGrant. */
export function dunningOnset(providerEventAt: string | null | undefined, periodEnd: string | null | undefined): string | null {
  const times = [providerEventAt, periodEnd]
    .map((t) => (t ? Date.parse(t) : NaN))
    .filter(Number.isFinite);
  return times.length ? new Date(Math.min(...times)).toISOString() : null;
}

/** Whole days since onset. 0 is the webhook day. Null when onset is missing. */
export function graceDay(onsetIso: string | null, nowMs: number): number | null {
  if (!onsetIso) return null;
  const onset = Date.parse(onsetIso);
  if (!Number.isFinite(onset)) return null;
  return Math.floor((nowMs - onset) / DAY_MS);
}

/**
 * The one email this run should enqueue, or null.
 * Day 5 wins once it is due, so a catch-up does not also send the day-1 note.
 */
export function pickDunningDay(onsetIso: string | null, sentDays: readonly number[], nowMs: number): DunningDay | null {
  const day = graceDay(onsetIso, nowMs);
  if (day == null || day < 1 || day > DUNNING_CATCHUP_MAX_DAY) return null;
  if (day >= 5 && !sentDays.includes(5)) return 5;
  if (day < 5 && !sentDays.includes(1)) return 1;
  return null;
}

export function dunningEmailEventType(day: DunningDay): string {
  return `teacher_dunning_email_day_${day}`;
}

/** Every marker either cron may have written for a day-1 or day-5 note. */
export const DUNNING_SENT_EVENT_TYPES = [
  'teacher_dunning_email_day_1',
  'teacher_dunning_email_day_5',
  'teacher_payment_failed_email',
  'teacher_dunning_day1_email',
  'teacher_dunning_day5_email',
] as const;

/** Map a stored event onto the day it already covered, including the churn-watch names. */
export function dunningDayFromEventType(eventType: string): DunningDay | null {
  if (
    eventType === dunningEmailEventType(1) ||
    eventType === 'teacher_payment_failed_email' ||
    eventType === 'teacher_dunning_day1_email'
  ) {
    return 1;
  }
  if (eventType === dunningEmailEventType(5) || eventType === 'teacher_dunning_day5_email') return 5;
  return null;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function signDunningRecover(payload: DunningRecoverPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify({ u: payload.userId, d: payload.day, e: payload.exp })));
  const mac = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyDunningRecover(token: string, secret: string, nowMs: number): DunningRecoverPayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0 || !secret) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', secret).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { u?: unknown; d?: unknown; e?: unknown };
    const userId = typeof parsed.u === 'string' ? parsed.u : '';
    const day = parsed.d;
    const exp = typeof parsed.e === 'number' ? parsed.e : NaN;
    if (!USER_ID.test(userId) || (day !== 1 && day !== 5) || !Number.isFinite(exp) || exp <= nowMs) return null;
    return { userId, day, exp };
  } catch {
    return null;
  }
}

/** Absolute one-click link. The click mints a fresh Polar session; the email never carries one. */
export function dunningRecoverEmailUrl(args: {
  userId: string;
  day: DunningDay;
  nowMs: number;
  secret: string;
  locale: string;
}): string {
  const token = signDunningRecover(
    { userId: args.userId, day: args.day, exp: args.nowMs + DUNNING_RECOVER_TTL_MS },
    args.secret,
  );
  const url = new URL(`${SITE}/api/subscription/recover`);
  url.searchParams.set('t', token);
  url.searchParams.set('locale', billingPortalLocale(args.locale));
  return url.toString();
}

import { describe, expect, it } from 'vitest';
import {
  DUNNING_CATCHUP_MAX_DAY,
  dunningOnset,
  dunningRecoverEmailUrl,
  graceDay,
  pickDunningDay,
  polarPaymentUpdateUrl,
  signDunningRecover,
  verifyDunningRecover,
} from '../dunningEscalation';

const DAY = 24 * 60 * 60 * 1000;
const ONSET = '2026-11-09T00:00:00.000Z';
const SECRET = 'test-cron-secret';

describe('dunning escalation schedule', () => {
  it('counts grace days from the earlier of the past_due event and the rolled period end', () => {
    expect(dunningOnset('2026-11-09T08:00:00.000Z', '2026-12-09T00:00:00.000Z')).toBe('2026-11-09T08:00:00.000Z');
    expect(dunningOnset(null, '2026-11-09T00:00:00.000Z')).toBe('2026-11-09T00:00:00.000Z');
    expect(dunningOnset(null, null)).toBeNull();
  });

  it('does not enqueue on the webhook day, and enqueues day 1 once 24h have passed', () => {
    const onset = Date.parse(ONSET);
    expect(graceDay(ONSET, onset + 23 * 60 * 60 * 1000)).toBe(0);
    expect(pickDunningDay(ONSET, [], onset + 23 * 60 * 60 * 1000)).toBeNull();
    expect(pickDunningDay(ONSET, [], onset + DAY)).toBe(1);
    expect(pickDunningDay(ONSET, [1], onset + 2 * DAY)).toBeNull();
  });

  it('enqueues the day-5 escalation once, including a catch-up after a missed run', () => {
    const onset = Date.parse(ONSET);
    expect(pickDunningDay(ONSET, [], onset + 5 * DAY)).toBe(5);
    expect(pickDunningDay(ONSET, [1], onset + 5 * DAY)).toBe(5);
    // The only paying teacher went past_due on 2026-11-09. By 2026-11-18 that is day 9,
    // so a missed day-5 run must still enqueue, and must not also enqueue day 1.
    expect(pickDunningDay(ONSET, [], onset + 9 * DAY)).toBe(5);
    expect(pickDunningDay(ONSET, [5], onset + 9 * DAY)).toBeNull();
  });

  it('stops after the catch-up window so a dormant row is not emailed forever', () => {
    const onset = Date.parse(ONSET);
    expect(pickDunningDay(ONSET, [], onset + (DUNNING_CATCHUP_MAX_DAY + 1) * DAY)).toBeNull();
    expect(pickDunningDay(null, [], onset + 5 * DAY)).toBeNull();
    expect(pickDunningDay('not-a-date', [], onset)).toBeNull();
  });
});

describe('Polar payment-update deep link', () => {
  it('rewrites a customer-portal session URL onto the billing settings page and keeps the session', () => {
    const raw = 'https://polar.sh/lexiclash/portal?customer_session_token=abc&email=t%40school.org';
    const out = new URL(polarPaymentUpdateUrl(raw)!);
    expect(out.origin).toBe('https://polar.sh');
    expect(out.pathname).toBe('/lexiclash/portal/settings');
    expect(out.searchParams.get('customer_session_token')).toBe('abc');
    expect(out.searchParams.get('email')).toBe('t@school.org');
  });

  it('accepts a trailing slash and a sandbox host, and refuses anything that is not the portal root', () => {
    expect(polarPaymentUpdateUrl('https://sandbox.polar.sh/lexiclash/portal/')!)
      .toContain('/lexiclash/portal/settings');
    expect(polarPaymentUpdateUrl('https://polar.sh/lexiclash/portal/settings?customer_session_token=abc'))
      .toContain('/portal/settings');
    expect(polarPaymentUpdateUrl('https://polar.sh/portal/session_fresh')).toBeNull();
    expect(polarPaymentUpdateUrl('http://polar.sh/lexiclash/portal?customer_session_token=abc')).toBeNull();
    expect(polarPaymentUpdateUrl('https://evil.example/lexiclash/portal?customer_session_token=abc')).toBeNull();
    expect(polarPaymentUpdateUrl('https://polar.sh/lexiclash/portal/orders?customer_session_token=abc')).toBeNull();
  });
});

describe('one-click recover link', () => {
  const now = Date.parse('2026-11-18T06:00:00.000Z');

  it('round-trips a signed token and rejects a tampered or expired one', () => {
    const token = signDunningRecover({ userId: '11111111-1111-4111-8111-111111111111', day: 5, exp: now + DAY }, SECRET);
    expect(verifyDunningRecover(token, SECRET, now)).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      day: 5,
      exp: now + DAY,
    });
    expect(verifyDunningRecover(token, 'other-secret', now)).toBeNull();
    expect(verifyDunningRecover(`${token}x`, SECRET, now)).toBeNull();
    expect(verifyDunningRecover(token, SECRET, now + 2 * DAY)).toBeNull();
    expect(verifyDunningRecover('not-a-token', SECRET, now)).toBeNull();
  });

  it('builds an absolute email link that carries the token and no LexiClash login', () => {
    const url = dunningRecoverEmailUrl({
      userId: '11111111-1111-4111-8111-111111111111',
      day: 5,
      nowMs: now,
      secret: SECRET,
      locale: 'he',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://www.lexiclash.live');
    expect(parsed.pathname).toBe('/api/subscription/recover');
    expect(parsed.searchParams.get('locale')).toBe('he');
    const token = parsed.searchParams.get('t');
    expect(token).toBeTruthy();
    expect(verifyDunningRecover(token!, SECRET, now)?.day).toBe(5);
    expect(url).not.toContain('/teacher');
  });
});

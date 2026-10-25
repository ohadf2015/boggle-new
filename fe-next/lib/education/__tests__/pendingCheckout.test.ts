import { describe, it, expect } from 'vitest';
import { CHECKOUT_STARTED_EVENT } from '../abandonedCheckout';
import {
  PENDING_CHECKOUT_MAX_DAYS,
  hasPendingCheckout,
  type PendingCheckoutEventRow,
} from '../pendingCheckout';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-25T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW - h * HOUR_MS).toISOString();
const daysAgo = (d: number) => new Date(NOW - d * DAY_MS).toISOString();

const startEvent = (over: Partial<PendingCheckoutEventRow> = {}): PendingCheckoutEventRow => ({
  id: 'ev1',
  event_type: CHECKOUT_STARTED_EVENT,
  created_at: hoursAgo(2),
  payload: { mode: 'paid', locale: 'en' },
  ...over,
});

describe('hasPendingCheckout', () => {
  it('exports PENDING_CHECKOUT_MAX_DAYS = 14', () => {
    expect(PENDING_CHECKOUT_MAX_DAYS).toBe(14);
  });

  it('returns true on a fresh checkout_started without completion', () => {
    expect(
      hasPendingCheckout({
        events: [startEvent()],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it('returns false when no checkout_started event exists', () => {
    expect(
      hasPendingCheckout({
        events: [],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it('returns false when a completion event exists at or after the start', () => {
    for (const event_type of [
      'checkout.completed',
      'order.paid',
      'order.created',
      'subscription.active',
      'subscription.created',
    ]) {
      expect(
        hasPendingCheckout({
          events: [
            startEvent({ created_at: hoursAgo(3) }),
            { event_type, created_at: hoursAgo(2) },
          ],
          hasPro: false,
          nowMs: NOW,
        }),
      ).toBe(false);
    }
  });

  it('ignores completion events older than the latest checkout_started', () => {
    expect(
      hasPendingCheckout({
        events: [
          { event_type: 'subscription.active', created_at: daysAgo(40) },
          startEvent({ created_at: hoursAgo(4) }),
        ],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it('returns false when the latest checkout_started is older than 14 days', () => {
    expect(
      hasPendingCheckout({
        events: [startEvent({ created_at: daysAgo(14.1) })],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(false);
    expect(
      hasPendingCheckout({
        events: [startEvent({ created_at: daysAgo(13.9) })],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it('returns false when payload.client_kind is script', () => {
    expect(
      hasPendingCheckout({
        events: [
          startEvent({
            payload: { mode: 'paid', locale: 'en', client_kind: 'script' },
          }),
        ],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it('uses latest-event-wins when a user has several checkout_started rows', () => {
    // Old start was completed, then a newer start was abandoned -> pending
    expect(
      hasPendingCheckout({
        events: [
          startEvent({ id: 'old', created_at: daysAgo(5) }),
          { event_type: 'checkout.completed', created_at: daysAgo(4) },
          startEvent({ id: 'new', created_at: hoursAgo(3) }),
        ],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(true);

    // Old real start, followed by a newer script start -> not pending
    expect(
      hasPendingCheckout({
        events: [
          startEvent({ id: 'old', created_at: hoursAgo(5), payload: { client_kind: 'browser' } }),
          startEvent({ id: 'new', created_at: hoursAgo(1), payload: { client_kind: 'script' } }),
        ],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(false);

    // Old abandoned start (>14d) followed by a newer fresh start -> pending
    expect(
      hasPendingCheckout({
        events: [
          startEvent({ id: 'old', created_at: daysAgo(20) }),
          startEvent({ id: 'new', created_at: daysAgo(2) }),
        ],
        hasPro: false,
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it('returns false when the user already has Pro', () => {
    expect(
      hasPendingCheckout({
        events: [startEvent()],
        hasPro: true,
        nowMs: NOW,
      }),
    ).toBe(false);
  });
});

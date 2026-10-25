// Derived server state for a teacher who started Polar checkout in the last 14 days
// and has not completed it. Never stored in `subscriptions.status` (Postgres CHECK).

import { CHECKOUT_STARTED_EVENT } from './abandonedCheckout';

export const PENDING_CHECKOUT_MAX_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PendingCheckoutEventRow {
  id?: string;
  event_type: string;
  created_at: string;
  payload?: unknown;
}

export function isCompletionEvent(eventType: string): boolean {
  return (
    eventType === 'checkout.completed' ||
    eventType.startsWith('order.') ||
    eventType.startsWith('subscription.')
  );
}

/**
 * Pure helper: given a teacher's `subscription_events` rows and whether they
 * currently have Pro, returns true iff:
 * (a) their latest `checkout_started` row is within the last 14 days,
 * (b) no completion event exists at or after that start, and
 * (c) the start row's `payload.client_kind` is not `'script'`.
 */
export function hasPendingCheckout({
  events,
  hasPro,
  nowMs = Date.now(),
}: {
  events: readonly PendingCheckoutEventRow[];
  hasPro: boolean;
  nowMs?: number;
}): boolean {
  if (hasPro) return false;

  let latestStart: PendingCheckoutEventRow | null = null;
  let latestStartMs = -Infinity;

  for (const row of events) {
    if (row.event_type !== CHECKOUT_STARTED_EVENT) continue;
    const ms = Date.parse(row.created_at);
    if (Number.isNaN(ms)) continue;
    if (!latestStart || ms > latestStartMs) {
      latestStart = row;
      latestStartMs = ms;
    }
  }

  if (!latestStart) return false;

  if (nowMs - latestStartMs > PENDING_CHECKOUT_MAX_DAYS * DAY_MS) {
    return false;
  }

  const kind =
    latestStart.payload && typeof latestStart.payload === 'object'
      ? (latestStart.payload as { client_kind?: unknown }).client_kind
      : null;
  if (kind === 'script') {
    return false;
  }

  for (const row of events) {
    if (!isCompletionEvent(row.event_type)) continue;
    const ms = Date.parse(row.created_at);
    if (Number.isNaN(ms)) continue;
    if (ms >= latestStartMs) {
      return false;
    }
  }

  return true;
}

export const isPendingCheckout = hasPendingCheckout;

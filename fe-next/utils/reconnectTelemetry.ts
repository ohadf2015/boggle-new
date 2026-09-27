/**
 * MP reconnect-gap telemetry.
 *
 * Server-side `mp_player_dropped` only fires on PERMANENT drops (grace-expiry /
 * host-cascade). The "disconnections during gameplay" users report are mostly
 * TRANSIENT socket drops that auto-reconnect within seconds — invisible to the
 * server event. This module measures that gap on the client so the felt-disconnect
 * rate, duration, and reason become observable in PostHog.
 *
 * `buildReconnectGapPayload` is pure (testable); `trackReconnectGap` fires the
 * event, guarded so analytics can never throw into the socket lifecycle.
 */
import posthog from '@/lib/analytics/lazyPosthog';

export interface ReconnectGapPayload {
  gap_ms: number;
  gap_seconds: number;
  attempt_number: number;
  reason: string;
}

/**
 * Build the event payload, or null when it shouldn't be reported (no recorded
 * disconnect, or a non-positive gap from clock skew).
 */
export function buildReconnectGapPayload(args: {
  disconnectedAt: number | null;
  now: number;
  attemptNumber: number;
  reason?: string;
}): ReconnectGapPayload | null {
  const { disconnectedAt, now, attemptNumber, reason } = args;
  if (disconnectedAt == null) return null;
  const gapMs = now - disconnectedAt;
  if (gapMs <= 0) return null;
  return {
    gap_ms: gapMs,
    gap_seconds: Math.round(gapMs / 1000),
    attempt_number: attemptNumber,
    reason: reason || 'unknown',
  };
}

/** Fire `mp_reconnect_gap` to PostHog. No-throw — analytics must not break sockets. */
export function trackReconnectGap(args: {
  disconnectedAt: number | null;
  now: number;
  attemptNumber: number;
  reason?: string;
}): void {
  try {
    const payload = buildReconnectGapPayload(args);
    if (!payload) return;
    posthog.capture('mp_reconnect_gap', payload);
  } catch {
    /* analytics is best-effort */
  }
}

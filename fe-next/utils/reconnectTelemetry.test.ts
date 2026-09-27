/**
 * Tests for the MP reconnect-gap telemetry payload builder.
 *
 * Why this exists: server telemetry (`mp_player_dropped`) only captures PERMANENT
 * drops (grace-expiry / host-cascade) and showed no mid-game epidemic — yet users
 * report "disconnections during gameplay". Those are TRANSIENT socket drops that
 * auto-reconnect and were previously UNMEASURED. This payload feeds a client event
 * so the felt-disconnect rate + duration + reason finally become observable.
 */
import { describe, it, expect } from 'vitest';
import { buildReconnectGapPayload } from './reconnectTelemetry';

describe('buildReconnectGapPayload', () => {
  it('returns null when there was no recorded disconnect timestamp', () => {
    expect(buildReconnectGapPayload({ disconnectedAt: null, now: 1000, attemptNumber: 1 })).toBeNull();
  });

  it('returns null for a non-positive gap (clock skew / same tick)', () => {
    expect(buildReconnectGapPayload({ disconnectedAt: 2000, now: 2000, attemptNumber: 1 })).toBeNull();
    expect(buildReconnectGapPayload({ disconnectedAt: 3000, now: 2000, attemptNumber: 1 })).toBeNull();
  });

  it('computes gap in ms and rounded seconds for a normal reconnect', () => {
    const payload = buildReconnectGapPayload({
      disconnectedAt: 10_000,
      now: 14_300,
      attemptNumber: 3,
      reason: 'ping timeout',
    });
    expect(payload).toEqual({
      gap_ms: 4300,
      gap_seconds: 4,
      attempt_number: 3,
      reason: 'ping timeout',
    });
  });

  it('defaults reason to "unknown" when none is provided', () => {
    const payload = buildReconnectGapPayload({ disconnectedAt: 0, now: 1500, attemptNumber: 1 });
    expect(payload?.reason).toBe('unknown');
    expect(payload?.gap_ms).toBe(1500);
  });
});

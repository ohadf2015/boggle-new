import { describe, it, expect } from 'vitest';
import {
  shouldWriteOnlineStatus,
  ONLINE_STATUS_MIN_WRITE_INTERVAL_MS,
} from '../onlineStatusThrottle';

describe('shouldWriteOnlineStatus', () => {
  it('allows the very first write (no prior write)', () => {
    expect(shouldWriteOnlineStatus(1_000, 0)).toBe(true);
  });

  it('blocks a second write inside the throttle window (multi-mount dedup)', () => {
    const last = 100_000;
    // two near-simultaneous callers (e.g. GlobalBottomNav + HeaderMobileMenu)
    expect(shouldWriteOnlineStatus(last + 500, last)).toBe(false);
  });

  it('allows the next write once the throttle window has elapsed', () => {
    const last = 100_000;
    expect(shouldWriteOnlineStatus(last + ONLINE_STATUS_MIN_WRITE_INTERVAL_MS, last)).toBe(true);
  });

  it('keeps the window comfortably under the 5-minute online threshold so presence stays accurate', () => {
    // socialHelpers treats last_seen_at within 5 min as "online". The write
    // cadence must stay well below that or active users would flip offline.
    expect(ONLINE_STATUS_MIN_WRITE_INTERVAL_MS).toBeLessThan(5 * 60 * 1000);
  });
});

/**
 * HTTP traffic registers `ip:path` keys but never calls unregisterKey, and
 * cleanup() only freed an ipData entry when its key Set was empty — so every
 * distinct client IP stayed in memory forever.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiterCore } from '../rateLimiter';

vi.mock('../logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const SIX_MINUTES = 6 * 60 * 1000;
let core: RateLimiterCore;

beforeEach(() => {
  vi.useFakeTimers();
  core = new RateLimiterCore({
    maxRequests: 10,
    windowMs: 60_000,
    blockDurationMs: 60_000,
    cleanupIntervalMs: 60_000,
  });
});

afterEach(() => {
  core.shutdown();
  vi.useRealTimers();
});

describe('RateLimiterCore.cleanup', () => {
  it('given IPs whose keys went stale and were never unregistered, when cleanup runs, then ipData is freed', () => {
    for (let i = 0; i < 100; i++) core.registerKey(`1.1.1.${i}:/api/x`, `1.1.1.${i}`);
    expect(core.getStats().trackedIps).toBe(100);

    vi.advanceTimersByTime(SIX_MINUTES);

    expect(core.getStats().trackedKeys).toBe(0);
    expect(core.getStats().trackedIps).toBe(0);
  });

  it('given a still-active IP, when cleanup runs, then it is kept', () => {
    core.registerKey('2.2.2.2:/api/x', '2.2.2.2');
    vi.advanceTimersByTime(4 * 60 * 1000);
    core.registerKey('2.2.2.2:/api/y', '2.2.2.2'); // fresh activity
    vi.advanceTimersByTime(2 * 60 * 1000);

    expect(core.getStats().trackedIps).toBe(1);
  });
});

/**
 * maybeTrackSignupCompleted — re-fire-proof signup conversion emit.
 *
 * Bug (PostHog 30d, 2026-05-28): `signup_completed` fired 380×/9 users (~42×
 * each). Root cause = AuthContext's `wasGuest` gate trusts an in-memory
 * `useRef(false)` that resets on every page mount, so a *restored* session on
 * cold load reads as a fresh guest→authed transition and re-fires the event.
 * Heavy reloaders (dev/admin cycling old test accounts) inflate it most.
 *
 * Fix = fire at most once per genuine signup via two guards:
 *   (a) account recency — `created_at` within a generous window (an OLD account
 *       signing in is a returning user, never a signup);
 *   (b) per-user dedup — a localStorage set of counted userIds, so the same
 *       account reloading (or a device cycling several accounts) counts once.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { /* noop */ }
  }
});

const NOW = 1_700_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();
const signupNames = () => capture.mock.calls.map((c) => c[0]).filter((n) => n === 'signup_completed');

describe('isRecentAccount', () => {
  it('true for an account created moments ago', async () => {
    const { isRecentAccount } = await import('../growthTracking');
    expect(isRecentAccount(iso(NOW - 30_000), NOW)).toBe(true);
  });

  it('false for an account created days ago (returning user)', async () => {
    const { isRecentAccount } = await import('../growthTracking');
    expect(isRecentAccount(iso(NOW - 2 * 24 * 60 * 60 * 1000), NOW)).toBe(false);
  });

  it('tolerates small clock skew (created_at slightly in the future)', async () => {
    const { isRecentAccount } = await import('../growthTracking');
    expect(isRecentAccount(iso(NOW + 30_000), NOW)).toBe(true);
  });

  it('false for missing or unparseable created_at (cannot confirm freshness)', async () => {
    const { isRecentAccount } = await import('../growthTracking');
    expect(isRecentAccount(undefined, NOW)).toBe(false);
    expect(isRecentAccount(null, NOW)).toBe(false);
    expect(isRecentAccount('not-a-date', NOW)).toBe(false);
  });
});

describe('maybeTrackSignupCompleted', () => {
  it('emits signup_completed once for a fresh account', async () => {
    const { maybeTrackSignupCompleted } = await import('../growthTracking');
    const emitted = maybeTrackSignupCompleted({ source: 'header_or_menu', userId: 'u1', createdAt: iso(NOW - 10_000), nowMs: NOW });
    expect(emitted).toBe(true);
    expect(signupNames()).toHaveLength(1);
    const call = capture.mock.calls.find((c) => c[0] === 'signup_completed');
    expect(call?.[1]).toMatchObject({ source: 'header_or_menu' });
  });

  it('does NOT emit for an OLD account (returning-user session restore)', async () => {
    const { maybeTrackSignupCompleted } = await import('../growthTracking');
    const emitted = maybeTrackSignupCompleted({ source: 'header_or_menu', userId: 'old', createdAt: iso(NOW - 5 * 24 * 60 * 60 * 1000), nowMs: NOW });
    expect(emitted).toBe(false);
    expect(signupNames()).toHaveLength(0);
  });

  it('does NOT re-emit on a second call for the same user (reload dedup)', async () => {
    const { maybeTrackSignupCompleted } = await import('../growthTracking');
    const args = { source: 'header_or_menu', userId: 'u1', createdAt: iso(NOW - 10_000), nowMs: NOW };
    expect(maybeTrackSignupCompleted(args)).toBe(true);
    expect(maybeTrackSignupCompleted(args)).toBe(false);
    expect(signupNames()).toHaveLength(1);
  });

  it('counts each distinct user once on a multi-account device', async () => {
    const { maybeTrackSignupCompleted } = await import('../growthTracking');
    const at = iso(NOW - 10_000);
    expect(maybeTrackSignupCompleted({ userId: 'a', createdAt: at, nowMs: NOW })).toBe(true);
    expect(maybeTrackSignupCompleted({ userId: 'b', createdAt: at, nowMs: NOW })).toBe(true);
    expect(maybeTrackSignupCompleted({ userId: 'a', createdAt: at, nowMs: NOW })).toBe(false);
    expect(signupNames()).toHaveLength(2);
  });
});

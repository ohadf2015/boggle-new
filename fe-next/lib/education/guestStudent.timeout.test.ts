import { describe, it, expect, vi } from 'vitest';
import { waitForProfile } from './guestStudent';

/**
 * Regression guard: a guest student's join must never hang.
 *
 * INCIDENT (2026-08-30): a first-time student filled in their name, pressed
 * JOIN, and nothing happened — no navigation, no toast, no error, and NO
 * request to /api/education/classroom/join at all. Pressing JOIN a second time
 * worked. Measured on production: the anonymous auth user WAS created on the
 * first press (auth.users row exists) but no classroom_membership followed.
 *
 * `joinClassroom` awaits `waitForProfile` before it fetches. `waitForProfile`
 * awaited a PostgREST query with no deadline, so if that query stalls during
 * the post-sign-in token swap the await never settles and the fetch is never
 * reached. The join RPC only needs the session — the profile await is a
 * convenience to avoid a redirect race, so it must be bounded, never blocking.
 */

/** A supabase-like client whose profile query never settles. */
function hangingClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => new Promise(() => {}), // never resolves
        }),
      }),
    }),
  } as never;
}

function respondingClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 'u1' } }),
        }),
      }),
    }),
  } as never;
}

describe('waitForProfile', () => {
  it('gives up and resolves false when the profile query hangs', async () => {
    vi.useFakeTimers();
    const result = waitForProfile(hangingClient(), 'u1', { tries: 3, delayMs: 10, timeoutMs: 200 });

    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe(false);
    vi.useRealTimers();
  });

  it('still resolves true promptly when the profile is readable', async () => {
    await expect(waitForProfile(respondingClient(), 'u1', { tries: 3, delayMs: 0 })).resolves.toBe(true);
  });
});

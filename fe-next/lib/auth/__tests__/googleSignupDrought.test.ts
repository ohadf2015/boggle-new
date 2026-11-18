import { describe, expect, it, vi } from 'vitest';
import {
  countGoogleSignupsSince,
  daytimeHoursEndingAt,
  shouldAlertGoogleSignupDrought,
} from '../googleSignupDrought';

describe('shouldAlertGoogleSignupDrought', () => {
  it('alerts when 8 daytime hours have 0 Google signups and the landing CTA was clicked', () => {
    expect(shouldAlertGoogleSignupDrought({
      googleSignups: 0,
      arrivals: 11,
      daytimeHours: 8,
    })).toBe(true);
  });

  it('stays quiet overnight, when Google still converts, or when nobody is clicking', () => {
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 0, arrivals: 40, daytimeHours: 7 })).toBe(false);
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 1, arrivals: 40, daytimeHours: 8 })).toBe(false);
    expect(shouldAlertGoogleSignupDrought({ googleSignups: 0, arrivals: 10, daytimeHours: 8 })).toBe(false);
  });

  it('counts only Israel daytime hours in an 8-hour lookback', () => {
    // 18:00 Israel is 16:00 UTC. The previous 8 hours are 10:00–18:00 local, all daytime.
    expect(daytimeHoursEndingAt(new Date('2026-11-17T16:00:00Z'), 8)).toBe(8);
    // 08:00 Israel is 06:00 UTC. The previous 8 hours are 00:00–08:00 local, only the last hour is daytime.
    expect(daytimeHoursEndingAt(new Date('2026-11-17T06:00:00Z'), 8)).toBe(1);
  });
});

describe('countGoogleSignupsSince', () => {
  const since = '2026-11-18T08:00:00.000Z';
  const user = (created_at: string, providers: string[], is_anonymous = false) => ({
    created_at,
    is_anonymous,
    app_metadata: { providers },
  });
  const clientWithPages = (pages: unknown[][]) => {
    const listUsers = vi.fn(async ({ page }: { page: number }) => ({
      data: { users: pages[page - 1] ?? [] },
      error: null,
    }));
    return { client: { auth: { admin: { listUsers } } }, listUsers };
  };

  it('counts only new non-anonymous Google users and stops at the first older page', async () => {
    const { client, listUsers } = clientWithPages([[
      user('2026-11-18T12:00:00.000Z', ['google']),
      user('2026-11-18T11:00:00.000Z', ['email']),
      user('2026-11-18T10:00:00.000Z', ['google'], true),
      user('2026-11-18T07:00:00.000Z', ['google']),
    ]]);

    await expect(countGoogleSignupsSince(client, since, 4)).resolves.toBe(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it('reads the next page while the window is still open', async () => {
    const { client, listUsers } = clientWithPages([
      [user('2026-11-18T12:00:00.000Z', ['email']), user('2026-11-18T11:00:00.000Z', ['email'])],
      [user('2026-11-18T10:00:00.000Z', ['google'])],
    ]);

    await expect(countGoogleSignupsSince(client, since, 2)).resolves.toBe(1);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it('throws on a listing error instead of reporting zero signups', async () => {
    const client = {
      auth: { admin: { listUsers: vi.fn(async () => ({ data: { users: [] }, error: { message: 'boom' } })) } },
    };

    await expect(countGoogleSignupsSince(client, since)).rejects.toThrow('boom');
  });

  it('throws when the window does not fit the page cap instead of reporting a partial count', async () => {
    const full = [user('2026-11-18T12:00:00.000Z', ['email'])];
    const { client } = clientWithPages(Array.from({ length: 20 }, () => full));

    await expect(countGoogleSignupsSince(client, since, 1)).rejects.toThrow(/page cap/);
  });
});

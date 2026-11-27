import { describe, it, expect } from 'vitest';
import { buildDailyActivity, fetchAnonymousUserIdsSince } from '../dailyActivity';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const input = (over = {}) => ({
  days: 3,
  nowMs: NOW,
  testIds: new Set<string>(['test']),
  games: [] as { created_at: string; player_id: string }[],
  guestGames: [] as { started_at: string; guest_session_id: string }[],
  signups: [] as { created_at: string; id: string }[],
  ...over,
});

describe('buildDailyActivity', () => {
  it('returns one row per day, oldest first, zero-filled', () => {
    const rows = buildDailyActivity(input());
    expect(rows.map((r) => r.date)).toEqual(['2026-11-08', '2026-11-09', '2026-11-10']);
    expect(rows.every((r) => r.totalGames === 0 && r.signups === 0)).toBe(true);
  });

  it('counts signed-in and guest games and their unique players per day', () => {
    const rows = buildDailyActivity(
      input({
        games: [
          { created_at: '2026-11-10T01:00:00Z', player_id: 'a' },
          { created_at: '2026-11-10T02:00:00Z', player_id: 'a' },
          { created_at: '2026-11-09T02:00:00Z', player_id: 'b' },
        ],
        guestGames: [{ started_at: '2026-11-10T03:00:00Z', guest_session_id: 'g1' }],
      }),
    );
    expect(rows[2]).toMatchObject({ games: 2, guestGames: 1, totalGames: 3, totalUniquePlayers: 2 });
    expect(rows[1]).toMatchObject({ games: 1, totalUniquePlayers: 1 });
  });

  it('drops test accounts from games and signups', () => {
    const rows = buildDailyActivity(
      input({
        games: [{ created_at: '2026-11-10T01:00:00Z', player_id: 'test' }],
        signups: [
          { created_at: '2026-11-10T01:00:00Z', id: 'test' },
          { created_at: '2026-11-10T01:00:00Z', id: 'real' },
          { created_at: '2026-11-09T01:00:00Z', id: 'real2' },
        ],
      }),
    );
    expect(rows[2]).toMatchObject({ games: 0, signups: 1 });
    expect(rows[1].signups).toBe(1);
  });

  it('ignores rows outside the window', () => {
    const rows = buildDailyActivity(input({ games: [{ created_at: '2026-10-01T01:00:00Z', player_id: 'a' }] }));
    expect(rows.reduce((n, r) => n + r.games, 0)).toBe(0);
  });

  it('drops anonymous classroom profiles from signups but still counts their games', () => {
    const rows = buildDailyActivity(
      input({
        anonymousIds: new Set(['guest']),
        games: [{ created_at: '2026-11-10T01:00:00Z', player_id: 'guest' }],
        signups: [
          { created_at: '2026-11-10T01:00:00Z', id: 'guest' },
          { created_at: '2026-11-10T01:00:00Z', id: 'real' },
        ],
      }),
    );
    expect(rows[2]).toMatchObject({ games: 1, signups: 1 });
  });

  it('buckets signups on the viewer\'s local date, not UTC', () => {
    const nowMs = Date.parse('2026-11-27T22:30:00Z'); // 00:30 on 28 Nov in Israel
    const rows = buildDailyActivity(
      input({
        days: 2,
        nowMs,
        timeZone: 'Asia/Jerusalem',
        signups: [
          { created_at: '2026-11-27T22:10:00Z', id: 'after-midnight' },
          { created_at: '2026-11-27T20:00:00Z', id: 'evening-before' },
        ],
      }),
    );
    expect(rows.map((r) => r.date)).toEqual(['2026-11-27', '2026-11-28']);
    expect(rows[0].signups).toBe(1);
    expect(rows[1].signups).toBe(1);
  });
});

describe('fetchAnonymousUserIdsSince', () => {
  const user = (id: string, created_at: string, is_anonymous?: boolean) => ({ id, created_at, is_anonymous });
  const lister = (...pages: ReturnType<typeof user>[][]) => ({
    auth: {
      admin: {
        listUsers: async ({ page }: { page: number }) => ({
          data: { users: pages[page - 1] ?? [] },
          error: null,
        }),
      },
    },
  });

  it('collects anonymous accounts in the window and ignores registered ones', async () => {
    const ids = await fetchAnonymousUserIdsSince(
      lister([
        user('new-anon', '2026-11-10T10:00:00Z', true),
        user('new-real', '2026-11-10T09:00:00Z', false),
        user('old-anon', '2026-11-01T00:00:00Z', true),
      ]),
      '2026-11-08T00:00:00.000Z',
    );
    expect([...ids]).toEqual(['new-anon']);
  });

  it('pages newest-first until a user is older than the window', async () => {
    const inWindow = Array.from({ length: 2 }, (_, i) => user(`anon-${i}`, '2026-11-10T01:00:00Z', true));
    const older = [user('old', '2026-11-01T00:00:00Z', true)];
    const ids = await fetchAnonymousUserIdsSince(lister(inWindow, older), '2026-11-08T00:00:00.000Z', 2);
    expect(ids).toEqual(new Set(['anon-0', 'anon-1']));
  });

  it('throws when the window exceeds the page cap', async () => {
    const page = Array.from({ length: 2 }, (_, i) => user(`anon-${i}`, '2026-11-10T01:00:00Z', true));
    const client = {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: page }, error: null }),
        },
      },
    };
    await expect(fetchAnonymousUserIdsSince(client, '2026-11-08T00:00:00.000Z', 2)).rejects.toThrow(/page cap/);
  });

  it('throws when the auth admin list fails', async () => {
    const client = {
      auth: {
        admin: {
          listUsers: async () => ({ data: null, error: { message: 'denied' } }),
        },
      },
    };
    await expect(fetchAnonymousUserIdsSince(client, '2026-11-08T00:00:00.000Z')).rejects.toThrow('denied');
  });
});

import { describe, it, expect } from 'vitest';
import { buildDailyActivity } from '../dailyActivity';

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
});

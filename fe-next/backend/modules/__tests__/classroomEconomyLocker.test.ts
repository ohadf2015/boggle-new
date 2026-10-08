import { describe, it, expect, vi } from 'vitest';
import { readLocker, type LockerDeps } from '../classroomEconomyLocker';

const row = {
  game_code: 'ABC',
  round_id: '3',
  rarity: 'rare',
  xp: 25,
  item_id: 'tile-neon',
  created_at: '2026-10-08T10:00:00Z',
};

describe('readLocker', () => {
  it('Given a student with chests, When read, Then rows come back camelCase and newest first', async () => {
    const deps: LockerDeps = { fetchRows: vi.fn(async () => ({ data: [row], error: null })) };
    expect(await readLocker('u1', 20, deps)).toEqual([
      { gameCode: 'ABC', roundId: '3', rarity: 'rare', xp: 25, itemId: 'tile-neon', createdAt: '2026-10-08T10:00:00Z' },
    ]);
    expect(deps.fetchRows).toHaveBeenCalledWith('u1', 20);
  });

  it('Given the read fails, When read, Then the locker is empty rather than an error', async () => {
    const deps: LockerDeps = { fetchRows: async () => ({ data: null, error: new Error('down') }) };
    expect(await readLocker('u1', 20, deps)).toEqual([]);
  });
});

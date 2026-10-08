import { describe, it, expect, vi } from 'vitest';
import { grantEndOfGameChest, type ChestDeps } from '../classroomEconomyChest';

function fakeDeps(claim: 'claimed' | 'taken' | 'unavailable', insertError: unknown = null) {
  const inserted: Record<string, unknown>[] = [];
  const xp: Array<[string, number]> = [];
  const deps: ChestDeps = {
    claim: vi.fn(async () => claim),
    insert: vi.fn(async (row: Record<string, unknown>) => {
      inserted.push(row);
      return { error: insertError };
    }),
    grantXp: vi.fn(async (userId: string, amount: number) => {
      xp.push([userId, amount]);
    }),
  };
  return { deps, inserted, xp };
}

const input = { gameCode: 'ABC', roundId: 'sess-1', userId: 'u1' };

describe('grantEndOfGameChest', () => {
  it('Given a first claim, When granted, Then the chest is written and XP is awarded', async () => {
    const { deps, inserted, xp } = fakeDeps('claimed');
    const chest = await grantEndOfGameChest(input, deps);
    expect(chest).not.toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ game_code: 'ABC', round_id: 'sess-1', user_id: 'u1' });
    expect(xp).toEqual([['u1', chest!.xp]]);
  });

  it('Given the claim key is taken, When granted again, Then nothing is written or awarded', async () => {
    const { deps, inserted, xp } = fakeDeps('taken');
    expect(await grantEndOfGameChest(input, deps)).toBeNull();
    expect(inserted).toHaveLength(0);
    expect(xp).toHaveLength(0);
  });

  it('Given Redis is unavailable, When granted, Then it fails closed with no write', async () => {
    const { deps, inserted, xp } = fakeDeps('unavailable');
    expect(await grantEndOfGameChest(input, deps)).toBeNull();
    expect(inserted).toHaveLength(0);
    expect(xp).toHaveLength(0);
  });

  it('Given the row insert fails, When granted, Then no XP is awarded for an unrecorded chest', async () => {
    const { deps, xp } = fakeDeps('claimed', new Error('db down'));
    expect(await grantEndOfGameChest(input, deps)).toBeNull();
    expect(xp).toHaveLength(0);
  });

  it('Given the same student, When claimed, Then the claim key names the room, round and player', async () => {
    const { deps } = fakeDeps('claimed');
    await grantEndOfGameChest(input, deps);
    expect(deps.claim).toHaveBeenCalledWith('classroom-chest:ABC:sess-1:u1');
  });
});

describe('guest rejoin', () => {
  it('Given a guest who rejoins on a new socket, When the end-of-game grant runs again, Then no second chest or XP', async () => {
    const claimed = new Set<string>();
    const claim = vi.fn(async (key: string) => {
      if (claimed.has(key)) return 'taken' as const;
      claimed.add(key);
      return 'claimed' as const;
    });
    const { deps, inserted, xp } = fakeDeps('claimed');
    deps.claim = claim;
    const guest = { gameCode: 'ABC', roundId: 'sess-1', userId: 'guest-anon-1' };

    expect(await grantEndOfGameChest(guest, deps)).not.toBeNull();
    expect(await grantEndOfGameChest(guest, deps)).toBeNull();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls.map((c) => c[0])).toEqual([
      'classroom-chest:ABC:sess-1:guest-anon-1',
      'classroom-chest:ABC:sess-1:guest-anon-1',
    ]);
    expect(inserted).toHaveLength(1);
    expect(xp).toHaveLength(1);
  });
});

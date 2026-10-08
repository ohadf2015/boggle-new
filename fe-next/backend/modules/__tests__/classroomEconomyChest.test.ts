import { describe, it, expect, vi } from 'vitest';
import { grantRoundChest, type ChestDeps, type ChestReveal } from '../classroomEconomyChest';

function fakeDeps(claim: 'claimed' | 'taken' | 'unavailable', insertError: unknown = null, grantError: Error | null = null) {
  const inserted: Record<string, unknown>[] = [];
  const xp: Array<[string, number]> = [];
  const parts: Array<[string, string]> = [];
  const removed: Array<Record<string, unknown>> = [];
  const store = new Map<string, ChestReveal>();
  const deps: ChestDeps = {
    claim: vi.fn(async () => claim),
    release: vi.fn(async () => {}),
    removeRow: vi.fn(async (row: Record<string, unknown>) => {
      removed.push(row);
    }),
    grantPart: vi.fn(async (userId: string, partKey: string) => {
      if (grantError) throw grantError;
      parts.push([userId, partKey]);
    }),
    insert: vi.fn(async (row: Record<string, unknown>) => {
      inserted.push(row);
      return { error: insertError };
    }),
    grantXp: vi.fn(async (userId: string, amount: number) => {
      xp.push([userId, amount]);
    }),
    remember: vi.fn(async (key: string, reveal: ChestReveal) => {
      store.set(key, reveal);
    }),
    recall: vi.fn(async (key: string) => store.get(key) ?? null),
  };
  return { deps, inserted, xp, store, parts, removed };
}

const input = { gameCode: 'ABC', roundId: 'sess-1', userId: 'u1', summary: { roundCash: 12, rank: 2, size: 5 } };

describe('grantRoundChest', () => {
  it('Given a first claim, When granted, Then the row is written, XP awarded and the reveal carries the round summary', async () => {
    const { deps, inserted, xp } = fakeDeps('claimed');
    const chest = await grantRoundChest(input, deps);
    expect(chest).toMatchObject({ gameCode: 'ABC', roundId: 'sess-1', roundCash: 12, rank: 2, size: 5 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ game_code: 'ABC', round_id: 'sess-1', user_id: 'u1' });
    expect(xp).toEqual([['u1', chest!.xp]]);
  });

  it('Given a first claim, When granted, Then the row is written before the chest part is owned', async () => {
    const { deps, parts, inserted } = fakeDeps('claimed');
    const chest = await grantRoundChest(input, deps);
    expect(parts).toEqual([['u1', chest!.itemId]]);
    expect(inserted).toHaveLength(1);
    expect(deps.insert).toHaveBeenCalledBefore(deps.grantPart as never);
  });

  it('Given the part write fails, When granted, Then the row is removed, no XP is awarded and the claim is released', async () => {
    const { deps, inserted, xp, removed, parts } = fakeDeps('claimed', null, new Error('profile write down'));
    expect(await grantRoundChest(input, deps)).toBeNull();
    expect(parts).toHaveLength(0);
    expect(inserted).toHaveLength(1);
    expect(removed).toEqual([{ gameCode: 'ABC', roundId: 'sess-1', userId: 'u1' }]);
    expect(xp).toHaveLength(0);
    expect(deps.release).toHaveBeenCalledTimes(1);
  });

  it('Given the claim is already held, When granted again, Then the first reveal is re-delivered and nothing is written', async () => {
    const { deps, inserted, xp } = fakeDeps('claimed');
    const first = await grantRoundChest(input, deps);
    deps.claim = vi.fn(async () => 'taken' as const);
    expect(await grantRoundChest(input, deps)).toEqual(first);
    expect(inserted).toHaveLength(1);
    expect(xp).toHaveLength(1);
  });

  it('Given the claim is taken and no reveal was stored, When granted, Then nothing is returned', async () => {
    const { deps, inserted } = fakeDeps('taken');
    expect(await grantRoundChest(input, deps)).toBeNull();
    expect(inserted).toHaveLength(0);
  });

  it('Given Redis is unavailable, When granted, Then it fails closed with no write', async () => {
    const { deps, inserted, xp } = fakeDeps('unavailable');
    expect(await grantRoundChest(input, deps)).toBeNull();
    expect(inserted).toHaveLength(0);
    expect(xp).toHaveLength(0);
  });

  it('Given the row insert fails, When granted, Then no XP is awarded and the claim is released for a retry', async () => {
    const { deps, xp, parts } = fakeDeps('claimed', new Error('db down'));
    expect(await grantRoundChest(input, deps)).toBeNull();
    expect(parts).toHaveLength(0);
    expect(xp).toHaveLength(0);
    expect(deps.release).toHaveBeenCalledWith('classroom-chest:ABC:sess-1:u1');
  });

  it('Given the same student, When claimed, Then the claim key names the room, round and player', async () => {
    const { deps } = fakeDeps('claimed');
    await grantRoundChest(input, deps);
    expect(deps.claim).toHaveBeenCalledWith('classroom-chest:ABC:sess-1:u1');
  });
});

describe('guest rejoin', () => {
  it('Given a guest who rejoins on a new socket, When the round reward is asked again, Then the same reveal returns and no second XP', async () => {
    const { deps, inserted, xp } = fakeDeps('claimed');
    const guest = { ...input, userId: 'guest-anon-1' };
    const first = await grantRoundChest(guest, deps);
    deps.claim = vi.fn(async () => 'taken' as const);
    expect(await grantRoundChest(guest, deps)).toEqual(first);
    expect(inserted).toHaveLength(1);
    expect(xp).toHaveLength(1);
  });
});

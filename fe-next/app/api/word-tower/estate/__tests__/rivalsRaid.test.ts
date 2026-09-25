import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ME, THEM, type Op, argOf, fakeDb, getReq, has, jsonResponse, postReq, row } from './fakeDb';
import { claimOnce } from '@/lib/server/claimOnce';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (d: unknown, i?: { status?: number }) => jsonResponse(d, i) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyWordTowerWreck: vi.fn(() => Promise.resolve()) }));

// Stateful claimOnce mock: tracks seen keys within a test
let claimedKeys: Set<string>;
vi.mock('@/lib/server/claimOnce', () => ({
  claimOnce: vi.fn(async (key: string) => {
    if (claimedKeys.has(key)) return 'taken';
    claimedKeys.add(key);
    return 'claimed';
  }),
}));

import { GET as getRivals } from '../rivals/route';
import { POST as postRaid } from '../raid/route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { notifyWordTowerWreck } from '@/backend/modules/pushNotificationTriggers';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';

const R2 = '33333333-3333-4333-8333-333333333333';
const R3 = '44444444-4444-4444-8444-444444444444';
const R4 = '55555555-5555-4555-8555-555555555555';
const status = (r: unknown) => (r as { status: number }).status;
const body = async (r: unknown) => (r as { json: () => Promise<Record<string, any>> }).json();

const profile = (id: string, name: string) => ({
  id,
  display_name: name,
  username: `Player_${id.slice(0, 4)}`,
  avatar_config: { hair: 'x' },
  avatar_emoji: null,
  avatar_color: null,
  avatar_image: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  claimedKeys = new Set();
  (getAuthedUser as any).mockResolvedValue({ id: ME });
});

describe('GET /api/word-tower/estate/rivals', () => {
  function rivalsDb(opts: { revenge?: unknown[] } = {}) {
    const mine = row({ best_m: 30 });
    return fakeDb({
      word_tower_estates: (ops: Op[]) => {
        if (has(ops, 'eq', 'player_id', ME)) return { data: mine, error: null };
        if (has(ops, 'in')) return { data: [row({ player_id: THEM, best_m: 12 })], error: null };
        if (has(ops, 'gte')) return { data: [row({ player_id: THEM, best_m: 31 }), row({ player_id: R2, best_m: 50 })], error: null };
        if (has(ops, 'lt')) return { data: [row({ player_id: R3, best_m: 29 }), row({ player_id: R4, best_m: 1 })], error: null };
        return { data: [], error: null };
      },
      word_tower_raids: () => ({ data: opts.revenge ?? [], error: null }),
      profiles: (ops: Op[]) => ({
        data: (argOf(ops, 'in', 1) as string[]).map((id) => profile(id, `name-${id.slice(0, 1)}`)),
        error: null,
      }),
    });
  }

  it('given estates near mine, when listed, then the 3 closest by best_m come back, never me', async () => {
    const db = rivalsDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getRivals(getReq()));
    expect(b.rivals.map((r: { userId: string }) => r.userId)).toEqual([THEM, R3, R2]);
    for (const c of db.calls.filter((x) => x.table === 'word_tower_estates' && (has(x.ops, 'gte') || has(x.ops, 'lt')))) {
      expect(has(c.ops, 'neq', 'player_id', ME)).toBe(true);
      expect(has(c.ops, 'eq', 'district', 1)).toBe(true);
    }
  });

  it('given rivals, when listed, then each carries userId + avatar fields from a SEPARATE profiles query', async () => {
    const db = rivalsDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getRivals(getReq()));
    expect(b.rivals[0]).toMatchObject({
      userId: THEM,
      displayName: 'name-2',
      avatar: { avatarConfig: { hair: 'x' } },
      district: 1,
      plots: expect.any(Array),
      lastTower: [],
    });
    for (const c of db.calls.filter((x) => x.table === 'word_tower_estates')) {
      expect(String(argOf(c.ops, 'select'))).not.toContain('profiles');
    }
    expect(db.calls.some((c) => c.table === 'profiles')).toBe(true);
  });

  it('given someone raided me, when listed, then they are in the revenge list with the raid id', async () => {
    const db = rivalsDb({ revenge: [{ id: 'raid-1', attacker_id: THEM, coins_stolen: 40, blocked: false, plot: 'vault', created_at: 'x' }] });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getRivals(getReq()));
    expect(b.revenge).toEqual([expect.objectContaining({ raidId: 'raid-1', coinsStolen: 40, rival: expect.objectContaining({ userId: THEM }) })]);
    const raidCall = db.calls.find((c) => c.table === 'word_tower_raids')!;
    expect(has(raidCall.ops, 'eq', 'defender_id', ME)).toBe(true);
    expect(has(raidCall.ops, 'is', 'avenged_at', null)).toBe(true);
  });
});

/** The raid rpc call (a legacy-coin fold may run sync_coins before it). */
const raidRpc = (db: { rpc: { mock: { calls: unknown[][] } } }) => db.rpc.mock.calls.find(([n]) => n === 'word_tower_apply_raid') as [string, Record<string, unknown>];

describe('POST /api/word-tower/estate/raid', () => {
  const built = PLOT_SLOTS.map((slot) => ({ slot, level: slot === 'vault' ? 3 : 1, damaged: false }));

  function raidDb(opts: { attacker?: object; defender?: object | null; revengeRow?: object | null; rpcError?: string } = {}) {
    return fakeDb(
      {
        word_tower_estates: (ops: Op[]) => {
          if (has(ops, 'eq', 'player_id', ME)) return { data: row({ raid_charges: 1, ...opts.attacker }), error: null };
          if (has(ops, 'eq', 'player_id', THEM)) {
            return { data: opts.defender === null ? null : row({ player_id: THEM, plots: built, ...opts.defender }), error: null };
          }
          return { data: null, error: null };
        },
        word_tower_raids: () => ({ data: opts.revengeRow ?? null, error: null }),
        profiles: () => ({ data: { display_name: 'Me Myself', username: 'Player_me' }, error: null }),
      },
      () =>
        opts.rpcError
          ? { data: null, error: { message: opts.rpcError } }
          : { data: [{ out_raid_id: 'new-raid', out_coins_stolen: 150, out_attacker_coins: 225 }], error: null },
      // The defender's coins are their app wallet, which is what a raid skims.
      { [THEM]: 1000 },
    );
  }

  it('given myself as the target, when raiding, then 400', async () => {
    (getSupabaseAdmin as any).mockReturnValue(raidDb().client);
    expect(status(await postRaid(postReq({ defenderId: ME, accuracy: 1, nonce: 'nonce-test-1' })))).toBe(400);
  });

  it('given no raid charges, when raiding, then 409 and no rpc', async () => {
    const db = raidDb({ attacker: { raid_charges: 0 } });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-test-1' })))).toBe(409);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('given an unknown defender, when raiding, then 404', async () => {
    (getSupabaseAdmin as any).mockReturnValue(raidDb({ defender: null }).client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-test-1' })))).toBe(404);
  });

  it('given an unshielded defender, when raiding, then the SERVER outcome is applied via the atomic rpc and they are notified', async () => {
    const db = raidDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postRaid(postReq({ defenderId: THEM, accuracy: 5, coinsStolen: 99999, nonce: 'nonce-test-1' }));
    expect(status(res)).toBe(200);
    const [name, args] = raidRpc(db);
    expect(name).toBe('word_tower_apply_raid');
    // accuracy clamped to 1: 8% + 12% of 1000 = 200, capped at 120 per district-1 raid.
    expect(args).toMatchObject({ p_attacker: ME, p_defender: THEM, p_blocked: false, p_slot: 'vault', p_coins_stolen: 120, p_revenge_raid_id: null });
    expect((await body(res)).outcome).toMatchObject({ kind: 'damaged', slot: 'vault' });
    expect(notifyWordTowerWreck).toHaveBeenCalledWith(THEM, 'Me Myself', 1, ME);
  });

  it('given a shielded defender, when raiding, then it is blocked and nobody is pushed', async () => {
    const db = raidDb({ defender: { shields: 1 } });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-test-1' })));
    expect(b.outcome.kind).toBe('blocked');
    expect(raidRpc(db)[1]).toMatchObject({ p_blocked: true, p_coins_stolen: 0 });
    expect(notifyWordTowerWreck).not.toHaveBeenCalled();
  });

  it('given revenge without a raid on me from them, when raiding, then 400 and no rpc', async () => {
    const db = raidDb({ revengeRow: null });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, revenge: true, nonce: 'nonce-test-1' })))).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('given a real revenge, when raiding, then the raid id is passed so it is avenged atomically', async () => {
    const db = raidDb({ revengeRow: { id: 'their-raid' } });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, revenge: true, nonce: 'nonce-test-1' })))).toBe(200);
    expect(raidRpc(db)[1]).toMatchObject({ p_revenge_raid_id: 'their-raid' });
    const lookup = db.calls.find((c) => c.table === 'word_tower_raids')!;
    expect(has(lookup.ops, 'eq', 'attacker_id', THEM)).toBe(true);
    expect(has(lookup.ops, 'eq', 'defender_id', ME)).toBe(true);
  });

  it('given zero charges and a raid to avenge, when hitting back, then it lands for free and spends no charge', async () => {
    // Coin Master's return hook: someone wrecked you, so the answer is waiting
    // whether or not you have banked a swing. The un-avenged raid row IS the
    // charge — the rpc flips `avenged_at` in the same transaction, so it can
    // be spent exactly once and never by a client that just claims it.
    const db = raidDb({ attacker: { raid_charges: 0 }, revengeRow: { id: 'their-raid' } });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, revenge: true, nonce: 'nonce-test-1' })))).toBe(200);
    expect(raidRpc(db)[1]).toMatchObject({ p_revenge_raid_id: 'their-raid' });
  });

  it('given zero charges and nothing to avenge, when raiding, then it is still refused', async () => {
    const db = raidDb({ attacker: { raid_charges: 0 }, revengeRow: null });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, revenge: true, nonce: 'nonce-test-1' })))).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('given the rpc reports no charges (race), when raiding, then 409', async () => {
    (getSupabaseAdmin as any).mockReturnValue(raidDb({ rpcError: 'no_charges' }).client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-test-1' })))).toBe(409);
  });

  it('given two different nonces against the same defender, when raiding, then both succeed and the RPC runs twice (no permanent lock)', async () => {
    const db = raidDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    // First raid with nonce 'nonce-abc'
    const res1 = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-abc' }));
    expect(status(res1)).toBe(200);
    // Second raid with different nonce 'nonce-xyz' against same opponent
    const res2 = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-xyz' }));
    expect(status(res2)).toBe(200);
    // RPC should have been called twice, not blocked by defender key
    expect(db.rpc.mock.calls.filter(([n]) => n === 'word_tower_apply_raid')).toHaveLength(2);
  });

  it('given same nonce twice, when raiding, then the second returns 409 (idempotency)', async () => {
    const db = raidDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    // First raid with nonce 'nonce-idem'
    const res1 = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-idem' }));
    expect(status(res1)).toBe(200);
    // Same nonce again
    const res2 = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-idem' }));
    expect(status(res2)).toBe(409);
    expect((await body(res2)).reason).toBe('duplicate');
    // RPC should have been called only once
    expect(db.rpc.mock.calls.filter(([n]) => n === 'word_tower_apply_raid')).toHaveLength(1);
  });

  it('given Redis unavailable on claimOnce, when raiding, then 503 and no RPC', async () => {
    const db = raidDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const mockClaim = vi.mocked(claimOnce as any);
    try {
      mockClaim.mockImplementation(async () => 'unavailable');
      const res = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-unavail' }));
      expect(status(res)).toBe(503);
      expect(db.rpc).not.toHaveBeenCalled();
    } finally {
      claimedKeys.clear();
      // Restore original implementation
      mockClaim.mockImplementation(async (key: string) => {
        if (claimedKeys.has(key)) return 'taken';
        claimedKeys.add(key);
        return 'claimed';
      });
    }
  });

  it('given a cached pre-nonce client (no nonce), when raiding, then the raid still lands (no silent 400 mid-deploy)', async () => {
    const db = raidDb();
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postRaid(postReq({ defenderId: THEM, accuracy: 1 }));
    expect(status(res)).toBe(200);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it('given no raid charges and no revenge, when checking charges, then claimOnce is not called and 409 returns early', async () => {
    const db = raidDb({ attacker: { raid_charges: 0 } });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    claimedKeys.clear();
    const res = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-nochg' }));
    expect(status(res)).toBe(409);
    // claimOnce should NOT have been called (it happens AFTER the charge gate)
    // The mock implementation increments claimedKeys, so we verify via the Set
    expect(claimedKeys.size).toBe(0);
  });
});

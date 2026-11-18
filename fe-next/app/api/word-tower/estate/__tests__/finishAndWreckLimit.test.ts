import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ME, THEM, type Op, estatesTable, fakeDb, getReq, has, jsonResponse, postReq, row } from './fakeDb';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (d: unknown, i?: { status?: number }) => jsonResponse(d, i) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/server/claimOnce', () => ({ claimOnce: vi.fn(async () => 'claimed') }));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyWordTowerWreck: vi.fn(() => Promise.resolve()) }));
const grantSoloGameXp = vi.fn(async () => null);
vi.mock('@/backend/modules/xpGrant', async (orig) => ({
  ...(await orig<typeof import('@/backend/modules/xpGrant')>()),
  grantSoloGameXp: (...a: unknown[]) => (grantSoloGameXp as (...x: unknown[]) => unknown)(...a),
}));

import { POST as postUpgrade } from '../upgrade/route';
import { POST as postRepair } from '../repair/route';
import { POST as postRaid } from '../raid/route';
import { POST as postRun } from '../run/route';
import { GET as getRivals } from '../rivals/route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL, PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { finishDistrictPlan } from '@/lib/wordTowerV2/estateFinish';

const status = (r: unknown) => (r as { status: number }).status;
const body = async (r: unknown) => (r as { json: () => Promise<Record<string, any>> }).json();
const maxedPlots = (damaged: string[] = []) => PLOT_SLOTS.map((slot) => ({ slot, level: MAX_PLOT_LEVEL, damaged: damaged.includes(slot) }));

beforeEach(() => {
  vi.clearAllMocks();
  (getAuthedUser as any).mockResolvedValue({ id: ME });
});

describe('POST /estate/upgrade { all: true }', () => {
  const price = finishDistrictPlan(emptyEstate())!.coins;

  it('given enough coins, then the district is finished in one debit and the next one opens', async () => {
    const table = estatesTable(row());
    const db = fakeDb({ word_tower_estates: table.handler }, undefined, { [ME]: price + 50 });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postUpgrade(postReq({ all: true, cost: price }));
    const b = await body(res);
    expect(status(res)).toBe(200);
    expect(b.districtCompleted).toBe(true);
    expect(b.cost).toBe(price);
    expect(b.estate.district).toBe(2);
    expect(db.walletLog).toHaveLength(1);
  });

  it('given too few coins, then 400 coins and nothing moves', async () => {
    const db = fakeDb({ word_tower_estates: estatesTable(row()).handler }, undefined, { [ME]: price - 1 });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postUpgrade(postReq({ all: true, cost: price }));
    expect(status(res)).toBe(400);
    expect((await body(res)).reason).toBe('coins');
    expect(db.walletLog).toHaveLength(0);
  });
});

describe('POST /estate/upgrade { all: true } price lock', () => {
  it('given a raid made the district dearer after the quote, then nothing is charged', async () => {
    const quoted = finishDistrictPlan(emptyEstate())!.coins;
    const plots = PLOT_SLOTS.map((slot, i) => ({ slot, level: i === 0 ? 1 : 0, damaged: i === 0 }));
    const db = fakeDb({ word_tower_estates: estatesTable(row({ plots })).handler }, undefined, { [ME]: quoted * 2 });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const low = finishDistrictPlan({ ...emptyEstate(), plots })!.coins - 1;
    const res = await postUpgrade(postReq({ all: true, cost: low }));
    expect((await body(res)).reason).toBe('price_changed');
    expect(db.walletLog).toHaveLength(0);
  });
});

describe('POST /estate/repair', () => {
  it('given the last damaged plot of a maxed district, when repaired, then the district completes', async () => {
    const db = fakeDb({ word_tower_estates: estatesTable(row({ plots: maxedPlots(['vault']), bricks: 1 })).handler });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await postRepair(postReq({ plot: 'vault' })));
    expect(b.districtCompleted).toBe(true);
    expect(b.estate.district).toBe(2);
  });
});

describe('POST /estate/run', () => {
  const run = { floors: 2, perfects: 0, bestCombo: 0, crates: 0, heightM: 90 };

  it('given a resumed tower, then XP counts only what was built this session', async () => {
    const db = fakeDb({ word_tower_estates: estatesTable(row()).handler });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    await postRun(postReq({ ...run, grownM: 6 }));
    expect(grantSoloGameXp).toHaveBeenCalledWith(expect.anything(), ME, { score: 6 });
  });

  it('given a client that claims more growth than height, then the height caps it', async () => {
    const db = fakeDb({ word_tower_estates: estatesTable(row()).handler });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    await postRun(postReq({ ...run, grownM: 5000 }));
    expect(grantSoloGameXp).toHaveBeenCalledWith(expect.anything(), ME, { score: 90 });
  });
});

describe('one wreck per rival per day', () => {
  function raidDb(wreckedToday: boolean) {
    return fakeDb(
      {
        word_tower_estates: (ops: Op[]) => ({ data: row({ player_id: has(ops, 'eq', 'player_id', ME) ? ME : THEM, raid_charges: 2 }), error: null }),
        word_tower_raids: (ops: Op[]) => ({
          data: has(ops, 'eq', 'revenge', false) && wreckedToday ? [{ defender_id: THEM }] : [],
          error: null,
        }),
      },
      () => ({ data: [{ out_raid_id: 'r1', out_coins_stolen: 0, out_attacker_coins: 30 }], error: null }),
    );
  }

  it('given I already wrecked them today, when I raid again, then it is refused before any charge is spent', async () => {
    const db = raidDb(true);
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-12345' }));
    expect(status(res)).toBe(409);
    expect((await body(res)).reason).toBe('already_wrecked');
    expect(db.rpc).not.toHaveBeenCalledWith('word_tower_apply_raid', expect.anything());
  });

  it('given no wreck today, when I raid, then it lands', async () => {
    const db = raidDb(false);
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, nonce: 'nonce-12345' })))).toBe(200);
  });

  it('given a revenge hit, then the daily limit does not apply', async () => {
    const db = fakeDb(
      {
        word_tower_estates: (ops: Op[]) => ({ data: row({ player_id: has(ops, 'eq', 'player_id', ME) ? ME : THEM }), error: null }),
        word_tower_raids: (ops: Op[]) => ({ data: has(ops, 'maybeSingle') ? { id: 'r9' } : [{ defender_id: THEM }], error: null }),
      },
      () => ({ data: [{ out_raid_id: 'r2', out_coins_stolen: 0, out_attacker_coins: 30 }], error: null }),
    );
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postRaid(postReq({ defenderId: THEM, accuracy: 1, revenge: true, nonce: 'nonce-12345' })))).toBe(200);
  });

  it('given the board is listed, then a rival wrecked today is marked', async () => {
    const db = fakeDb({
      word_tower_estates: (ops: Op[]) => {
        if (has(ops, 'eq', 'player_id', ME)) return { data: row(), error: null };
        return has(ops, 'gte') ? { data: [row({ player_id: THEM })], error: null } : { data: [], error: null };
      },
      word_tower_raids: (ops: Op[]) => ({ data: has(ops, 'eq', 'revenge', false) ? [{ defender_id: THEM }] : [], error: null }),
      profiles: () => ({ data: [], error: null }),
    });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getRivals(getReq()));
    expect(b.rivals[0].wreckedToday).toBe(true);
  });

  it('given a closer rival was already hit, then a fresh rival is offered first', async () => {
    const OTHER = '33333333-3333-4333-8333-333333333333';
    const db = fakeDb({
      word_tower_estates: (ops: Op[]) => {
        if (has(ops, 'eq', 'player_id', ME)) return { data: row({ best_m: 30 }), error: null };
        return has(ops, 'gte') ? { data: [row({ player_id: THEM, best_m: 31 }), row({ player_id: OTHER, best_m: 60 })], error: null } : { data: [], error: null };
      },
      word_tower_raids: (ops: Op[]) => ({ data: has(ops, 'eq', 'revenge', false) ? [{ defender_id: THEM }] : [], error: null }),
      profiles: () => ({ data: [], error: null }),
    });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getRivals(getReq()));
    expect(b.rivals.map((r: { userId: string }) => r.userId)).toEqual([OTHER, THEM]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ME, THEM, TS, type Op, argOf, estatesTable, fakeDb, getReq, has, jsonResponse, postReq, row } from './fakeDb';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (d: unknown, i?: { status?: number }) => jsonResponse(d, i) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyWordTowerWreck: vi.fn(() => Promise.resolve()) }));

import { GET as getEstate } from '../route';
import { POST as postRun } from '../run/route';
import { POST as postUpgrade } from '../upgrade/route';
import { POST as postRepair } from '../repair/route';
import { POST as postSeen } from '../seen/route';
import { GET as getRivals } from '../rivals/route';
import { POST as postRaid } from '../raid/route';
import { POST as postClaim } from '../claim/route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { chestSeed, emptyEstate, rollChest, runCoins, runQuality, upgradeCost } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';

const isRead = (ops: Op[]) => has(ops, 'select') && !has(ops, 'update') && !has(ops, 'insert') && !has(ops, 'upsert');
const status = (r: unknown) => (r as { status: number }).status;
const body = async (r: unknown) => (r as { json: () => Promise<Record<string, any>> }).json();

beforeEach(() => {
  vi.clearAllMocks();
  (getAuthedUser as any).mockResolvedValue({ id: ME });
  (checkApiRateLimit as any).mockReturnValue({ success: true });
});

describe('every estate route', () => {
  it.each([
    ['GET /', () => getEstate(getReq())],
    ['POST /run', () => postRun(postReq({}))],
    ['POST /upgrade', () => postUpgrade(postReq({ plot: 'vault' }))],
    ['POST /repair', () => postRepair(postReq({ plot: 'vault' }))],
    ['POST /seen', () => postSeen(postReq({}))],
    ['GET /rivals', () => getRivals(getReq())],
    ['POST /raid', () => postRaid(postReq({ defenderId: THEM, accuracy: 1 }))],
    ['POST /claim', () => postClaim(postReq({ estate: {} }))],
  ])('given no session, when %s is called, then 401 and the db is never touched', async (_name, call) => {
    (getAuthedUser as any).mockResolvedValueOnce(null);
    expect(status(await call())).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe('GET /api/word-tower/estate', () => {
  it('given no session, when read, then 401', async () => {
    (getAuthedUser as any).mockResolvedValueOnce(null);
    expect(status(await getEstate(getReq()))).toBe(401);
  });

  it('given a new player, when read, then an empty estate row is created and returned with neutral perks', async () => {
    const est = estatesTable(null);
    const db = fakeDb({ word_tower_estates: est.handler, word_tower_raids: () => ({ data: [], error: null }) });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await getEstate(getReq());
    expect(status(res)).toBe(200);
    const b = await body(res);
    expect(b.estate).toEqual(emptyEstate());
    expect(b.perks.coinMult).toBe(1);
    expect(db.calls.some((c) => c.table === 'word_tower_estates' && has(c.ops, 'upsert'))).toBe(true);
  });

  it('given unseen raids, when read, then they come back with attacker names from a SEPARATE profiles query', async () => {
    const est = estatesTable(row({ coins: 50 }));
    const db = fakeDb({
      word_tower_estates: est.handler,
      word_tower_raids: () => ({
        data: [{ id: 'r1', attacker_id: THEM, blocked: false, plot: 'vault', coins_stolen: 12, revenge: false, created_at: TS, avenged_at: null }],
        error: null,
      }),
      profiles: () => ({ data: [{ id: THEM, display_name: 'Dana', username: 'Player_x' }], error: null }),
    });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const b = await body(await getEstate(getReq()));
    expect(b.raids).toEqual([
      expect.objectContaining({ id: 'r1', attackerId: THEM, attackerName: 'Dana', plot: 'vault', coinsStolen: 12, blocked: false }),
    ]);
    const raidsCall = db.calls.find((c) => c.table === 'word_tower_raids')!;
    expect(has(raidsCall.ops, 'eq', 'defender_id', ME)).toBe(true);
    expect(has(raidsCall.ops, 'is', 'seen_at', null)).toBe(true);
    expect(String(argOf(raidsCall.ops, 'select'))).not.toContain('profiles');
  });
});

describe('POST /api/word-tower/estate/run', () => {
  const summary = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };

  it('given a run, when banked, then the SERVER computes coins + chest (client coins ignored)', async () => {
    const est = estatesTable(row());
    const db = fakeDb({ word_tower_estates: est.handler });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postRun(postReq({ ...summary, coins: 999999 }));
    expect(status(res)).toBe(200);
    const b = await body(res);
    const chest = rollChest(chestSeed(ME, 0), runQuality(summary), 1);
    expect(b.coins).toBe(runCoins(summary));
    expect(b.chest).toEqual(chest);
    expect(Number(est.get()!.coins)).toBe(runCoins(summary) + chest.coins);
    expect(est.get()!.runs).toBe(1);
    expect(est.get()!.raid_charges).toBe(1);
  });

  it('given a forged huge run, when banked, then the fields are clamped', async () => {
    const est = estatesTable(row());
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const res = await postRun(postReq({ floors: 99, perfects: 99, bestCombo: 99, crates: 30, heightM: 400 }));
    expect(status(res)).toBe(200);
    expect((await body(res)).coins).toBeLessThanOrEqual(3000);
  });

  it('given a malformed body, when banked, then 400', async () => {
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({}).client);
    expect(status(await postRun(postReq({ floors: 'lots' })))).toBe(400);
  });

  it('given the rate limit is hit, when banked, then 429', async () => {
    (checkApiRateLimit as any).mockReturnValueOnce({ success: false });
    expect(status(await postRun(postReq(summary)))).toBe(429);
  });

  it('given a tower, when banked as the best run, then last_tower is stored compact and sanitised', async () => {
    const est = estatesTable(row());
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const tower = [{ word: '\u202Etop', w: 300, x: 1, y: -60, angle: 0, color: 1 }];
    await postRun(postReq({ ...summary, tower }));
    expect(est.get()!.last_tower).toEqual([['top', 300, 1, -60, 0, 1]]);
  });
});

describe('POST /api/word-tower/estate/run — braces', () => {
  it('given paid braces, when banked, then the server charges them off the run coins', async () => {
    const summary = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };
    const est = estatesTable(row());
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const b = await body(await postRun(postReq({ ...summary, braces: 1 })));
    expect(b.coins).toBe(runCoins(summary) - 40);
  });
});

describe('POST /api/word-tower/estate/claim', () => {
  it('given a guest estate and a fresh account, when claimed, then guest coins + upgrade value are credited (plots never adopted)', async () => {
    const est = estatesTable(row());
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const guest = { ...emptyEstate(), coins: 150, runs: 3, plots: PLOT_SLOTS.map((slot, i) => ({ slot, level: i === 0 ? 2 : 0, damaged: false })) };
    const res = await postClaim(postReq({ estate: guest }));
    expect(status(res)).toBe(200);
    const b = await body(res);
    expect(b.estate.coins).toBe(150 + upgradeCost(1, 'foundation', 0) + upgradeCost(1, 'foundation', 1));
    expect(b.estate.plots[0].level).toBe(0);
    expect(est.get()!.runs).toBe(3);
  });

  it('given no body estate, when claimed, then 400', async () => {
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({}).client);
    expect(status(await postClaim(postReq({})))).toBe(400);
  });
});

describe('POST /api/word-tower/estate/upgrade', () => {
  it('given coins, when upgrading, then the level rises and the cost is spent server-side', async () => {
    const est = estatesTable(row({ coins: 500 }));
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const res = await postUpgrade(postReq({ plot: 'vault' }));
    expect(status(res)).toBe(200);
    const saved = est.get()!;
    expect((saved.plots as Array<{ slot: string; level: number }>).find((p) => p.slot === 'vault')!.level).toBe(1);
    expect(Number(saved.coins)).toBe(500 - upgradeCost(1, 'vault', 0));
  });

  it('given too few coins, when upgrading, then 400 with the reason and nothing is written', async () => {
    const est = estatesTable(row({ coins: 0 }));
    const db = fakeDb({ word_tower_estates: est.handler });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postUpgrade(postReq({ plot: 'vault' }));
    expect(status(res)).toBe(400);
    expect((await body(res)).reason).toBe('coins');
    expect(db.calls.some((c) => has(c.ops, 'update'))).toBe(false);
  });

  it('given the last plot maxed, when upgrading, then the district completes and advances', async () => {
    const plots = PLOT_SLOTS.map((slot) => ({ slot, level: slot === 'landmark' ? 4 : 5, damaged: false }));
    const est = estatesTable(row({ coins: 100000, plots }));
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    const b = await body(await postUpgrade(postReq({ plot: 'landmark' })));
    expect(b.districtCompleted).toBe(true);
    expect(b.estate.district).toBe(2);
    expect(est.get()!.district).toBe(2);
  });

  it('given an unknown plot, when upgrading, then 400', async () => {
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({}).client);
    expect(status(await postUpgrade(postReq({ plot: 'moon-base' })))).toBe(400);
  });

  it('given a concurrent write, when the first compare-and-swap loses, then it retries on fresh state', async () => {
    const est = estatesTable(row({ coins: 500 }));
    let first = true;
    const db = fakeDb({
      word_tower_estates: (ops) => {
        if (has(ops, 'update') && first) {
          first = false;
          return { data: [], error: null };
        }
        return est.handler(ops);
      },
    });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    expect(status(await postUpgrade(postReq({ plot: 'vault' })))).toBe(200);
    expect(db.calls.filter((c) => has(c.ops, 'update'))).toHaveLength(2);
  });
});

describe('POST /api/word-tower/estate/repair', () => {
  it('given a damaged plot, when repaired, then it is intact again', async () => {
    const plots = PLOT_SLOTS.map((slot) => ({ slot, level: slot === 'vault' ? 2 : 0, damaged: slot === 'vault' }));
    const est = estatesTable(row({ coins: 500, plots }));
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: est.handler }).client);
    expect(status(await postRepair(postReq({ plot: 'vault' })))).toBe(200);
    expect((est.get()!.plots as Array<{ damaged: boolean }>).every((p) => !p.damaged)).toBe(true);
  });

  it('given an intact plot, when repaired, then 400 intact', async () => {
    (getSupabaseAdmin as any).mockReturnValue(fakeDb({ word_tower_estates: estatesTable(row({ coins: 5 })).handler }).client);
    const res = await postRepair(postReq({ plot: 'vault' }));
    expect(status(res)).toBe(400);
    expect((await body(res)).reason).toBe('intact');
  });
});

describe('POST /api/word-tower/estate/seen', () => {
  it('given raid ids, when marked, then only MY unseen raids are stamped', async () => {
    const db = fakeDb({ word_tower_raids: () => ({ data: [{ id: 'r1' }], error: null }) });
    (getSupabaseAdmin as any).mockReturnValue(db.client);
    const res = await postSeen(postReq({ ids: ['33333333-3333-4333-8333-333333333333'] }));
    expect(status(res)).toBe(200);
    const c = db.calls[0];
    expect(has(c.ops, 'update')).toBe(true);
    expect(has(c.ops, 'eq', 'defender_id', ME)).toBe(true);
    expect(has(c.ops, 'is', 'seen_at', null)).toBe(true);
    expect(isRead(c.ops)).toBe(false);
  });
});

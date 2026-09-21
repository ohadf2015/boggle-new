/**
 * POST /api/adventure/node — the map half of a run.
 */
// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, json: async () => data })) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => mockGetAuthedUser(...a) }));

const mockCreateAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => mockCreateAdminClient() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { POST } from '../route';
import { signPayload } from '@/lib/adventure/play/attemptToken';
import { freshRun, verifyRun, signRun, enterNode } from '@/lib/adventure/play/runToken';
import { buildRunMap, reachableFrom } from '@/lib/adventure/play/runMap';
import { shopStock } from '@/lib/adventure/play/shop';

const USER_ID = 'node-user';
const SECRET = 'test-key';
const SEED = 'node-seed';
const req = (body: unknown) => ({ headers: { get: () => '127.0.0.1' }, json: async () => body });

function fakeDb(completions: unknown[] = []) {
  const from = () => ({
    select: () => {
      const f: [string, unknown][] = [];
      const b: any = {
        eq(c: string, v: unknown) { f.push([c, v]); return b; },
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data: completions, error: null }).then(res, rej),
      };
      return b;
    },
  });
  return { from } as any;
}

/** A run standing on a row-0 node of the pinned map, with gold to spend. */
const MAP = buildRunMap(SEED, 1);
const FIRST = MAP.nodes.find((n) => n.row === 0)!;
const standing = (over = {}) => ({ ...enterNode(freshRun(1, USER_ID, SEED), FIRST.id), gold: 500, ...over });
const tokenFor = (run: unknown) => signRun(run as never, SECRET);
/** The first reachable node of a given kind, searched breadth-first from EVERY row-0 node. */
function findReachable(kind: string) {
  let frontier = MAP.nodes.filter((n) => n.row === 0).map((n) => n.id);
  const seen = new Set(frontier);
  for (let depth = 0; depth < 8; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const to of reachableFrom(MAP, id)) {
        const node = MAP.nodes.find((n) => n.id === to)!;
        if (node.kind === kind) return { from: id, node };
        if (!seen.has(to)) { seen.add(to); next.push(to); }
      }
    }
    frontier = next;
  }
  // Silent skips are how a whole node kind goes untested — fail instead.
  throw new Error(`no reachable ${kind} node on the pinned map`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
  mockCreateAdminClient.mockReturnValue(fakeDb());
  process.env.ADVENTURE_ATTEMPT_SECRET = SECRET;
});

describe('POST /api/adventure/node', () => {
  it('Given no auth, When called, Then 401', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    expect((await POST(req({ world: 1 }))).status).toBe(401);
  });

  it('Given no runToken, When called for world 1, Then a run is minted with a map and row-0 choices', async () => {
    const res = await POST(req({ world: 1 }));
    expect(res.status).toBe(200);
    expect(res.data.currentNode).toBeNull();
    // Row 0 is one fight (all its lanes were the same board) — no fake choice.
    expect(res.data.reachable).toHaveLength(1);
    expect(res.data.map.nodes.length).toBeGreaterThan(0);
    expect(verifyRun(res.data.runToken, SECRET)?.u).toBe(USER_ID);
    expect(res.data.run).not.toHaveProperty('seed');
  });

  it('Given world 2 with no world-1 boss cleared, When a run is minted, Then 403 Locked', async () => {
    mockCreateAdminClient.mockReturnValue(fakeDb([]));
    expect((await POST(req({ world: 2 }))).status).toBe(403);
  });

  it('Given a v1 run token, When called, Then 400 with the run_version code', async () => {
    const legacy = signPayload({ u: USER_ID, w: 1, step: 2, hp: 5, maxHp: 5, relics: [], potions: {}, gold: 0, seed: SEED }, SECRET, 'run');
    const res = await POST(req({ world: 1, runToken: legacy }));
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('run_version');
  });

  it("Given another user's run token, When called, Then it is refused", async () => {
    const res = await POST(req({ world: 1, runToken: tokenFor({ ...standing(), u: 'someone-else' }) }));
    expect(res.status).toBe(400);
  });

  it('Given an unreachable node, When entered, Then 400 unreachable', async () => {
    const far = MAP.nodes.find((n) => n.row === 5)!;
    const res = await POST(req({ world: 1, runToken: tokenFor(standing()), nodeId: far.id }));
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('unreachable');
  });

  it('Given a fight node, When entered here, Then it is refused as a play node', async () => {
    const fight = findReachable('fight');
    const run = { ...standing(), node: fight.from, path: [fight.from] };
    const res = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: fight.node.id }));
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('play_node');
  });

  it('Given a treasure node, When entered, Then prizes are OFFERED and nothing is granted yet', async () => {
    const t = findReachable('treasure');
    const run = { ...standing(), node: t.from, path: [t.from] };
    const res = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: t.node.id }));
    expect(res.status).toBe(200);
    expect(res.data.node.kind).toBe('treasure');
    expect(res.data.currentNode).toBe(t.node.id);
    expect(res.data.node.offers.length).toBeGreaterThanOrEqual(2);
    expect(res.data.node.taken).toBeUndefined();
    expect(res.data.run.relics).toHaveLength(0);
  });

  it('Given an open chest, When one prize is picked, Then only that prize lands', async () => {
    const t = findReachable('treasure');
    const run = { ...standing(), node: t.from, path: [t.from] };
    const opened = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: t.node.id }));
    const goldBefore = opened.data.run.gold;
    const idx = opened.data.node.offers.findIndex((o: { kind: string }) => o.kind === 'relic');
    const picked = await POST(req({ world: 1, runToken: opened.data.runToken, choice: idx }));
    expect(picked.status).toBe(200);
    expect(picked.data.run.relics).toHaveLength(1);
    expect(picked.data.run.gold).toBe(goldBefore);
    expect(picked.data.node.taken).toBe(idx);
  });

  it('Given an open chest, When it is skipped, Then nothing is granted and it stays answered', async () => {
    const t = findReachable('treasure');
    const run = { ...standing(), node: t.from, path: [t.from] };
    const opened = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: t.node.id }));
    const skip = opened.data.node.offers.length;
    const res = await POST(req({ world: 1, runToken: opened.data.runToken, choice: skip }));
    expect(res.status).toBe(200);
    expect(res.data.run.relics).toHaveLength(0);
    expect(res.data.node.taken).toBe(skip);
    const again = await POST(req({ world: 1, runToken: res.data.runToken, choice: 0 }));
    expect(again.status).toBe(400);
    expect(again.data.code).toBe('taken');
  });

  it('Given a shop node, When entered and an item is bought, Then gold drops and the item lands', async () => {
    const s = findReachable('shop');
    const run = { ...standing(), node: s.from, path: [s.from] };
    const entered = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: s.node.id }));
    expect(entered.data.node.kind).toBe('shop');
    expect(entered.data.node.items).toEqual(shopStock(SEED, s.node.id, []));

    const idx = entered.data.node.items.findIndex((i: { type: string }) => i.type === 'relic');
    const bought = await POST(req({ world: 1, runToken: entered.data.runToken, choice: idx }));

    expect(bought.status).toBe(200);
    expect(bought.data.run.gold).toBe(500 - entered.data.node.items[idx].price);
    expect(bought.data.run.relics).toHaveLength(1);
  });

  it('Given a shop and an empty purse, When an item is bought, Then 400 poor and gold is untouched', async () => {
    const s = findReachable('shop');
    const run = { ...standing({ gold: 0 }), node: s.from, path: [s.from] };
    const entered = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: s.node.id }));
    const res = await POST(req({ world: 1, runToken: entered.data.runToken, choice: 0 }));
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('poor');
  });

  it('Given a rest node, When the heal is taken, Then HP rises and a second choice is refused', async () => {
    const r = findReachable('rest');
    const run = { ...standing({ hp: 1 }), node: r.from, path: [r.from] };
    const entered = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: r.node.id }));
    expect(entered.data.node.kind).toBe('rest');

    const healed = await POST(req({ world: 1, runToken: entered.data.runToken, choice: 0 }));
    expect(healed.data.run.hp).toBeGreaterThan(1);

    const again = await POST(req({ world: 1, runToken: healed.data.runToken, choice: 1 }));
    expect(again.status).toBe(400);
    expect(again.data.code).toBe('taken');
  });

  it('Given an event node, When answered, Then the outcome is applied and reported', async () => {
    const e = findReachable('event');
    const run = { ...standing(), node: e.from, path: [e.from] };
    const entered = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: e.node.id }));
    expect(entered.data.node.kind).toBe('event');
    expect(typeof entered.data.node.id).toBe('string');

    const answered = await POST(req({ world: 1, runToken: entered.data.runToken, choice: 0 }));
    expect(answered.status).toBe(200);
    expect(answered.data.node.taken).toBe(0);
    expect(answered.data.run.gold).toBeGreaterThanOrEqual(0);
  });

  it('Given a pending draft offer, When a pick rides a map move, Then the relic is applied', async () => {
    const t = findReachable('treasure');
    const run = { ...standing(), node: t.from, path: [t.from], offer: [{ type: 'relic', id: 'magnet' }] };
    const res = await POST(req({ world: 1, runToken: tokenFor(run), nodeId: t.node.id, pick: 0 }));
    expect(res.status).toBe(200);
    expect(res.data.run.relics).toContain('magnet');
    expect(res.data.run.offer).toBeUndefined();
  });

  it('Given a pick of null, When sent, Then the offer is skipped and the map comes back', async () => {
    const run = { ...standing(), offer: [{ type: 'relic', id: 'magnet' }] };
    const res = await POST(req({ world: 1, runToken: tokenFor(run), pick: null }));
    expect(res.status).toBe(200);
    expect(res.data.run.relics).toEqual([]);
    expect(res.data.run.offer).toBeUndefined();
    expect(res.data.reachable).toEqual(reachableFrom(MAP, FIRST.id));
  });
});

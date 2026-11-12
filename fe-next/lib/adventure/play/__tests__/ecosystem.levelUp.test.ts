import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyLevelUp: vi.fn(async () => undefined) }));
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: vi.fn(async () => ({ success: true })) }));

import { creditEcosystem } from '../ecosystem';

function fakeDb(profile: Record<string, unknown>, xpRow: Record<string, unknown> | null) {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'update', 'upsert']) c[m] = () => c;
    c.maybeSingle = async () => result;
    c.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res);
    return c;
  };
  return {
    from: (table: string) => chain(table === 'profiles' ? { data: profile, error: null } : { data: null, error: null }),
    rpc: vi.fn(async () => ({ data: xpRow ? [xpRow] : [], error: null })),
  };
}

const input = (db: unknown) => ({
  db: db as never, userId: 'u1', score: 400, wordCount: 5, longestWord: 'toad',
  nodeKind: 'fight' as const, world: 1, level: 1, worldCleared: false, elapsedMs: 30_000,
});

describe('creditEcosystem level-up', () => {
  beforeEach(() => vi.clearAllMocks());

  it('given a stale profile level, when the grant crosses a level, then the level-up comes from the RPC row', async () => {
    const db = fakeDb({ current_level: 1, total_xp: 0 }, { new_total_xp: 470, xp_granted: 100, new_level: 3 });
    const out = await creditEcosystem(input(db));
    expect(out.xpGained).toBe(100);
    expect(out.levelUp).toMatchObject({ oldLevel: 2, newLevel: 3, levelsGained: 1 });
  });

  it('given a grant that stays inside the level, when credited, then there is no level-up', async () => {
    const db = fakeDb({ current_level: 1, total_xp: 0 }, { new_total_xp: 300, xp_granted: 20, new_level: 2 });
    const out = await creditEcosystem(input(db));
    expect(out.xpGained).toBe(20);
    expect(out.levelUp).toBeUndefined();
  });
});

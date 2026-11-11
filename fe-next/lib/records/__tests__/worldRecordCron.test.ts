import { describe, it, expect, vi, beforeEach } from 'vitest';

const { notifyRecordBroken, grantAchievements, capture } = vi.hoisted(() => ({
  notifyRecordBroken: vi.fn(async () => undefined),
  grantAchievements: vi.fn(async () => ['WORLD_RECORD']),
  capture: vi.fn(),
}));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyRecordBroken }));
vi.mock('@/backend/modules/achievements/grantAchievements', () => ({ grantAchievements }));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture }) }));
vi.mock('@/backend/utils/profanityFilter', () => ({ isProfane: () => false }));

import { worldRecordDeps, WORLD_RECORD_ACHIEVEMENT } from '../worldRecordCron';

function db(over: { rpc?: unknown; select?: unknown; upsert?: unknown } = {}) {
  const upsert = vi.fn(async () => over.upsert ?? { error: null });
  return {
    upsert,
    rpc: vi.fn(async () => over.rpc ?? { data: [{ record_key: 'blast' }], error: null }),
    from: vi.fn(() => ({
      select: () => ({ limit: async () => over.select ?? { data: [], error: null } }),
      upsert,
    })),
  };
}

describe('worldRecordDeps', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads candidates through the service-role RPC', async () => {
    const client = db();
    const rows = await worldRecordDeps(client as never).fetchCandidates();
    expect(client.rpc).toHaveBeenCalledWith('game_record_candidates', { p_per_key: 5 });
    expect(rows).toEqual([{ record_key: 'blast' }]);
  });

  it('throws on an RPC error instead of returning an empty list', async () => {
    const client = db({ rpc: { data: null, error: { message: 'missing function' } } });
    await expect(worldRecordDeps(client as never).fetchCandidates()).rejects.toThrow('missing function');
  });

  it('upserts with a refreshed_at stamp and throws on failure', async () => {
    const ok = db();
    await worldRecordDeps(ok as never).upsert([{ record_key: 'blast' } as never]);
    expect(ok.upsert).toHaveBeenCalledWith([expect.objectContaining({ record_key: 'blast', refreshed_at: expect.any(String) })], { onConflict: 'record_key' });

    const bad = db({ upsert: { error: { message: 'rls' } } });
    await expect(worldRecordDeps(bad as never).upsert([{ record_key: 'blast' } as never])).rejects.toThrow('rls');
  });

  it('grants the world record achievement and routes pushes and events', async () => {
    const client = db();
    const deps = worldRecordDeps(client as never);
    await deps.grant('u1');
    expect(grantAchievements).toHaveBeenCalledWith(client, 'u1', [WORLD_RECORD_ACHIEVEMENT], expect.any(Function));
    await deps.notifyBroken('u0', 'Maya', 'blast', 'u1');
    expect(notifyRecordBroken).toHaveBeenCalledWith('u0', 'Maya', 'blast', 'u1');
    deps.capture('u1', 'world_record_broken', { mode: 'blast' });
    expect(capture).toHaveBeenCalledWith({ distinctId: 'u1', event: 'world_record_broken', properties: { mode: 'blast' } });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { pickHolders, planRecordChanges, refreshWorldRecords, type RecordCandidate, type StoredRecord } from '../worldRecordRefresh';

const cand = (over: Partial<RecordCandidate>): RecordCandidate => ({
  record_key: 'qp_classic',
  mode: 'quickPlay',
  holder_id: 'u1',
  display_name: 'Maya',
  username: 'maya',
  score: 900,
  set_at: '2026-11-10T10:00:00Z',
  rank: 1,
  ...over,
});

const stored = (over: Partial<StoredRecord>): StoredRecord => ({
  record_key: 'qp_classic',
  mode: 'quickPlay',
  holder_id: 'u0',
  holder_name: 'Dan',
  score: 800,
  set_at: '2026-11-01T10:00:00Z',
  previous_holder_id: null,
  previous_score: null,
  ...over,
});

describe('pickHolders', () => {
  it('leaves a record empty when no candidate has a public name', () => {
    const picked = pickHolders([
      cand({ holder_id: 'u1', display_name: 'Swift Fox', username: 'swiftfox', rank: 1 }),
    ], () => false);
    expect(picked.get('qp_classic')).toBeUndefined();
  });

  it('prefers a public display name, then a public username, then the next candidate', () => {
    const isPublic = (name: string | null | undefined) => name === 'Noa' || name === 'tal';
    const picked = pickHolders([
      cand({ holder_id: 'u1', display_name: 'Guest_12', username: 'Player_ab', rank: 1, score: 990 }),
      cand({ holder_id: 'u2', display_name: 'Nope', username: 'tal', rank: 2, score: 950 }),
      cand({ holder_id: 'u3', display_name: 'Noa', rank: 3, score: 900 }),
    ], isPublic);
    expect(picked.get('qp_classic')).toMatchObject({ holder_id: 'u2', holder_name: 'tal', score: 950 });
  });

  it('keeps each record key separate', () => {
    const picked = pickHolders([
      cand({ record_key: 'blast', mode: 'blast', holder_id: 'b1', display_name: 'Ari' }),
      cand({ holder_id: 'q1', display_name: 'Lia' }),
    ], () => true);
    expect(picked.get('blast')?.holder_id).toBe('b1');
    expect(picked.get('qp_classic')?.holder_id).toBe('q1');
  });
});

describe('planRecordChanges', () => {
  const holder = (over: Partial<StoredRecord> = {}) => ({ ...stored({ holder_id: 'u1', holder_name: 'Maya', score: 900 }), ...over });

  it('seeds a record silently the first time', () => {
    const plan = planRecordChanges(new Map(), new Map([['qp_classic', holder()]]));
    expect(plan.upserts).toHaveLength(1);
    expect(plan.upserts[0].previous_holder_id).toBeNull();
    expect(plan.broken).toEqual([]);
  });

  it('marks a new holder with a higher score as a broken record and keeps who held it', () => {
    const plan = planRecordChanges(new Map([['qp_classic', stored({})]]), new Map([['qp_classic', holder()]]));
    expect(plan.upserts[0]).toMatchObject({ holder_id: 'u1', previous_holder_id: 'u0', previous_score: 800 });
    expect(plan.broken).toEqual([{ recordKey: 'qp_classic', mode: 'quickPlay', previousHolderId: 'u0', newHolderId: 'u1', newHolderName: 'Maya', score: 900, previousScore: 800 }]);
  });

  it('does not call it broken when the old holder drops out and a lower score takes over', () => {
    const plan = planRecordChanges(
      new Map([['qp_classic', stored({ score: 1000 })]]),
      new Map([['qp_classic', holder({ score: 900 })]]),
    );
    expect(plan.upserts[0]).toMatchObject({ holder_id: 'u1', previous_holder_id: null, previous_score: null });
    expect(plan.broken).toEqual([]);
  });

  it('does not call it broken on a tie', () => {
    const plan = planRecordChanges(
      new Map([['qp_classic', stored({ score: 900 })]]),
      new Map([['qp_classic', holder({ score: 900 })]]),
    );
    expect(plan.broken).toEqual([]);
  });

  it('keeps the previous holder when the same player raises their own record', () => {
    const plan = planRecordChanges(
      new Map([['qp_classic', stored({ holder_id: 'u1', holder_name: 'Maya', score: 850, previous_holder_id: 'u0', previous_score: 800 })]]),
      new Map([['qp_classic', holder({ score: 900 })]]),
    );
    expect(plan.upserts[0]).toMatchObject({ holder_id: 'u1', score: 900, previous_holder_id: 'u0', previous_score: 800 });
    expect(plan.broken).toEqual([]);
  });

  it('writes nothing when the record and name did not change', () => {
    const same = holder();
    const plan = planRecordChanges(new Map([['qp_classic', { ...same }]]), new Map([['qp_classic', same]]));
    expect(plan.upserts).toEqual([]);
  });
});

describe('refreshWorldRecords', () => {
  function deps(over: Partial<Parameters<typeof refreshWorldRecords>[0]> = {}) {
    return {
      fetchCandidates: vi.fn(async () => [cand({ holder_id: 'u1', display_name: 'Maya', score: 900 })]),
      fetchStored: vi.fn(async () => [stored({})]),
      upsert: vi.fn(async () => undefined),
      notifyBroken: vi.fn(async () => undefined),
      grant: vi.fn(async () => ['WORLD_RECORD']),
      capture: vi.fn(),
      isPublic: () => true,
      ...over,
    };
  }

  it('upserts, then notifies, grants and tracks each broken record once', async () => {
    const d = deps();
    const out = await refreshWorldRecords(d);
    expect(d.upsert).toHaveBeenCalledWith([expect.objectContaining({ record_key: 'qp_classic', holder_id: 'u1' })]);
    expect(d.notifyBroken).toHaveBeenCalledWith('u0', 'Maya', 'qp_classic', 'u1');
    expect(d.grant).toHaveBeenCalledWith('u1');
    expect(d.capture).toHaveBeenCalledWith('u1', 'world_record_broken', { mode: 'quickPlay', record_key: 'qp_classic', score: 900, previous_score: 800 });
    expect(out).toEqual({ records: 1, written: 1, broken: 1 });
  });

  it('grants seeded holders without a push or a broken event', async () => {
    const d = deps({ fetchStored: vi.fn(async () => []) });
    await refreshWorldRecords(d);
    expect(d.grant).toHaveBeenCalledWith('u1');
    expect(d.notifyBroken).not.toHaveBeenCalled();
    expect(d.capture).not.toHaveBeenCalled();
  });

  it('does not notify anyone when the write failed', async () => {
    const d = deps({ upsert: vi.fn(async () => { throw new Error('db down'); }) });
    await expect(refreshWorldRecords(d)).rejects.toThrow('db down');
    expect(d.notifyBroken).not.toHaveBeenCalled();
  });

  it('fails loudly when the candidate lookup returns nothing, instead of reporting a quiet success', async () => {
    const d = deps({ fetchCandidates: vi.fn(async () => []) });
    await expect(refreshWorldRecords(d)).rejects.toThrow(/no record candidates/);
    expect(d.upsert).not.toHaveBeenCalled();
  });
});

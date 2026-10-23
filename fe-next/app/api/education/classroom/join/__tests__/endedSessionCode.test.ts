import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
const sets = new Map<string, Set<string>>();
const redis = {
  get: vi.fn(async (k: string) => store.get(k) ?? null),
  sadd: vi.fn(async (k: string, v: string) => {
    const s = sets.get(k) ?? new Set<string>();
    s.add(v);
    sets.set(k, s);
    return 1;
  }),
  scard: vi.fn(async (k: string) => sets.get(k)?.size ?? 0),
  expire: vi.fn(async () => 1),
  del: vi.fn(async (k: string) => (sets.delete(k) ? 1 : 0)),
};
vi.mock('@/backend/cache/redisCache', () => ({ getCacheClient: () => redis }));

import {
  lookupEndedClassroomSession,
  recordEndedCodeTry,
  countEndedCodeTries,
  clearEndedCodeTries,
} from '../endedSessionCode';

beforeEach(() => {
  store.clear();
  sets.clear();
  vi.clearAllMocks();
});

describe('lookupEndedClassroomSession', () => {
  it('given an ended session record, when looked up, then it names the class', async () => {
    store.set('classroom_game:ABC123', JSON.stringify({ classroomId: 'c1', endedAt: '2026-10-23T10:00:00Z' }));
    await expect(lookupEndedClassroomSession('ABC123')).resolves.toEqual({ classroomId: 'c1' });
  });

  it('given a session marked status ended, then it names the class', async () => {
    store.set('classroom_game:ABC123', JSON.stringify({ classroomId: 'c1', status: 'ended' }));
    await expect(lookupEndedClassroomSession('ABC123')).resolves.toEqual({ classroomId: 'c1' });
  });

  it('given a live session, then it is not an ended one', async () => {
    store.set('classroom_game:ABC123', JSON.stringify({ classroomId: 'c1', status: 'playing' }));
    await expect(lookupEndedClassroomSession('ABC123')).resolves.toBeNull();
  });

  it('given no record or a broken one, then null and no throw', async () => {
    await expect(lookupEndedClassroomSession('NOPE00')).resolves.toBeNull();
    store.set('classroom_game:BAD000', '{not json');
    await expect(lookupEndedClassroomSession('BAD000')).resolves.toBeNull();
    redis.get.mockRejectedValueOnce(new Error('down'));
    await expect(lookupEndedClassroomSession('ABC123')).resolves.toBeNull();
  });
});

describe('ended code tries', () => {
  it('counts each student once and expires the tally', async () => {
    await recordEndedCodeTry('c1', 's1');
    await recordEndedCodeTry('c1', 's1');
    await recordEndedCodeTry('c1', 's2');
    await expect(countEndedCodeTries('c1')).resolves.toBe(2);
    expect(redis.expire).toHaveBeenCalled();
  });

  it('clears the tally once the teacher starts a game', async () => {
    await recordEndedCodeTry('c1', 's1');
    await clearEndedCodeTries('c1');
    await expect(countEndedCodeTries('c1')).resolves.toBe(0);
  });

  it('never throws when Redis is down', async () => {
    redis.sadd.mockRejectedValueOnce(new Error('down'));
    await expect(recordEndedCodeTry('c1', 's1')).resolves.toBeUndefined();
    redis.scard.mockRejectedValueOnce(new Error('down'));
    await expect(countEndedCodeTries('c1')).resolves.toBe(0);
  });
});

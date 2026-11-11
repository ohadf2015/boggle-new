import { vi } from 'vitest';

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
const tick = () => new Promise((r) => setTimeout(r, 1));
const fakeRedis = {
  get: vi.fn(async (k: string) => { await tick(); return store.get(k) ?? null; }),
  setex: vi.fn(async (k: string, _ttl: number, v: string) => { await tick(); store.set(k, v); }),
  sadd: vi.fn(async () => 1),
  srem: vi.fn(async () => 1),
  del: vi.fn(async () => 1),
};
vi.mock('../../redisClient', () => ({ getRedisClient: () => fakeRedis }));
vi.mock('../../utils/eduLiveEvents', () => ({ captureLiveGameEnded: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { recordClassroomRosterEntry } from '../classroomRoster';
import { getClassroomGame, reopenClassroomGameForRound, updateClassroomGameStatus } from '../classroomGameManager';

const KEY = 'classroom_game:ROS123';
const base = { gameCode: 'ROS123', classroomId: 'c1', teacherId: 't1', players: [], vocabularyWords: [], settings: {}, createdAt: '2026-11-12T00:00:00Z' };

beforeEach(() => {
  store.clear();
});

describe('roster entries survive other writers of the classroom record', () => {
  it('Given a roster write racing a status write and the end of the game, Then the roster is still on the record', async () => {
    store.set(KEY, JSON.stringify({ ...base, status: 'waiting' }));
    const inHand = JSON.parse(store.get(KEY)!);
    await Promise.all([
      recordClassroomRosterEntry('ROS123', inHand, 's1'),
      updateClassroomGameStatus('ROS123', 'playing'),
      recordClassroomRosterEntry('ROS123', inHand, 's2'),
      updateClassroomGameStatus('ROS123', 'ended'),
    ]);
    const final = await getClassroomGame('ROS123');
    expect(final?.rosterUserIds?.sort()).toEqual(['s1', 's2']);
    expect(final?.endedAt).toBeTruthy();
  });

  it('Given a round start holding a copy read before a student was recorded, When it reopens the round, Then the student is kept', async () => {
    store.set(KEY, JSON.stringify({ ...base, status: 'finished' }));
    const preloaded = await getClassroomGame('ROS123');
    await recordClassroomRosterEntry('ROS123', preloaded, 's1');
    await reopenClassroomGameForRound('ROS123', preloaded);
    const final = await getClassroomGame('ROS123');
    expect(final?.status).toBe('playing');
    expect(final?.rosterUserIds).toEqual(['s1']);
  });
});

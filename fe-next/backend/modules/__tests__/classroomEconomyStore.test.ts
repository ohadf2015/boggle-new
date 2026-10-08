import { describe, it, expect, vi, beforeEach } from 'vitest';

const hashes = new Map<string, Map<string, string>>();
let redisAvailable = true;

vi.mock('../../redisClient', () => ({
  getRedisClient: () =>
    redisAvailable
      ? {
          hget: async (k: string, f: string) => hashes.get(k)?.get(f) ?? null,
          hset: async (k: string, f: string, v: string) => {
            if (!hashes.has(k)) hashes.set(k, new Map());
            hashes.get(k)!.set(f, v);
            return 1;
          },
          hgetall: async (k: string) => Object.fromEntries(hashes.get(k) ?? new Map()),
          expire: async () => 1,
        }
      : null,
}));

vi.mock('../classroomGameManager', () => ({
  CLASSROOM_GAME_TTL: 14400,
  getClassroomGame: async () => ({ gameCode: 'ABC', settings: { economy: { wrongAnswerCost: true } } }),
  withClassroomGameLock: <T>(_c: string, fn: () => Promise<T>) => fn(),
}));

import {
  mutateEconomy,
  readAllEconomy,
  readEconomy,
  resolveConfig,
} from '../classroomEconomyStore';
import { emptyEconomyState, recordCorrectWord } from '../classroomEconomy';

beforeEach(() => {
  hashes.clear();
  redisAvailable = true;
});

describe('classroomEconomyStore', () => {
  it('Given no record, When read, Then a fresh state is returned', async () => {
    expect(await readEconomy('ABC', 'u1')).toEqual(emptyEconomyState());
  });

  it('Given a mutation, When written, Then the next read sees the new cash', async () => {
    await mutateEconomy('ABC', 'u1', 'r1', (s) => {
      const res = recordCorrectWord(s, { wordLength: 4, fromLesson: false, now: 0 });
      return { state: res.state, result: res.delta };
    });
    expect((await readEconomy('ABC', 'u1'))?.cash).toBe(2);
  });

  it('Given Redis is down, When read, Then null is returned (fail closed)', async () => {
    redisAvailable = false;
    expect(await readEconomy('ABC', 'u1')).toBeNull();
  });

  it('Given Redis is down, When mutated, Then nothing is awarded and null is returned', async () => {
    redisAvailable = false;
    const res = await mutateEconomy('ABC', 'u1', 'r1', (s) => ({ state: s, result: 'ran' }));
    expect(res).toBeNull();
  });

  it('Given several students, When the board is read, Then every player is returned', async () => {
    await mutateEconomy('ABC', 'u1', 'r1', (s) => ({ state: { ...s, cashEarned: 5 }, result: null }));
    await mutateEconomy('ABC', 'u2', 'r1', (s) => ({ state: { ...s, cashEarned: 9 }, result: null }));
    const all = await readAllEconomy('ABC');
    expect(Object.keys(all ?? {}).sort()).toEqual(['u1', 'u2']);
  });

  it('Given a round change, When mutated, Then streak resets but cash carries', async () => {
    await mutateEconomy('ABC', 'u1', 'r1', (s) => ({ state: { ...s, cash: 30, streak: 4 }, result: null }));
    await mutateEconomy('ABC', 'u1', 'r2', (s) => ({ state: s, result: null }));
    const s = await readEconomy('ABC', 'u1');
    expect(s?.cash).toBe(30);
    expect(s?.streak).toBe(0);
  });
});

describe('resolveConfig', () => {
  it('Given no settings, Then power-ups are on and the wrong-answer cost is off', () => {
    expect(resolveConfig({ settings: {} } as never)).toEqual({ wrongAnswerCost: false, powerUps: true });
  });

  it('Given the teacher turned cost on and power-ups off, Then both are honoured', () => {
    expect(
      resolveConfig({ settings: { economy: { wrongAnswerCost: true, powerUps: false } } } as never)
    ).toEqual({ wrongAnswerCost: true, powerUps: false });
  });
});

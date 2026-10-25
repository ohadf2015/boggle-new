import { describe, it, expect, vi, beforeEach } from 'vitest';

const hashes = new Map<string, Map<string, string>>();
let redisAvailable = true;
let redisBroken = false;
const { logError } = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { error: logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
const broken = async () => { throw new Error('READONLY'); };

vi.mock('../../redisClient', () => ({
  getRedisClient: () =>
    redisAvailable
      ? {
          hget: async (k: string, f: string) => (redisBroken ? broken() : hashes.get(k)?.get(f) ?? null),
          hset: async (k: string, f: string, v: string) => {
            if (!hashes.has(k)) hashes.set(k, new Map());
            hashes.get(k)!.set(f, v);
            return 1;
          },
          hgetall: async (k: string) => (redisBroken ? broken() : Object.fromEntries(hashes.get(k) ?? new Map())),
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
  redisBroken = false;
  logError.mockClear();
});

describe('classroomEconomyStore — Redis errors are never silent', () => {
  it('Given Redis throws, When a student award is mutated, Then nothing is awarded and the withheld award is logged with the game', async () => {
    redisBroken = true;
    const res = await mutateEconomy('GAME1', 'u1', 'r1', (s) => ({ state: s, result: 'paid' }));
    expect(res).toBeNull();
    expect(logError).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('GAME1'), expect.anything());
  });

  it('Given Redis throws on reads, Then both read paths log too', async () => {
    redisBroken = true;
    expect(await readEconomy('GAME2', 'u1')).toBeNull();
    expect(await readAllEconomy('GAME2B')).toBeNull();
    expect(logError).toHaveBeenCalledTimes(2);
  });

  it('Given a burst of failures in one game, Then logging is rate-limited so Sentry is not flooded', async () => {
    redisBroken = true;
    for (let i = 0; i < 30; i++) await mutateEconomy('GAME3', `u${i}`, 'r1', (s) => ({ state: s, result: null }));
    expect(logError.mock.calls.length).toBeLessThan(5);
    expect(logError.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
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

  it('Given a 7-word streak last round, When the next round reads the state, Then the streak and round cash start over', async () => {
    for (let i = 0; i < 7; i++) {
      await mutateEconomy('ABC', 'u1', 'r1', (s) => {
        const res = recordCorrectWord(s, { wordLength: 4, fromLesson: false, now: 0 });
        return { state: res.state, result: res.delta };
      });
    }
    const next = await readEconomy('ABC', 'u1', 'r2');
    expect(next?.streak).toBe(0);
    expect(next?.roundCash).toBe(0);
    expect(next?.cash).toBeGreaterThan(0);
    expect((await readEconomy('ABC', 'u1', 'r1'))?.streak).toBe(7);
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

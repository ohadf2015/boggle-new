// Mock ioredis
const store = new Map<string, string>();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((...keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve(keys.length);
    }),
    keys: jest.fn((pattern: string) => {
      const prefix = pattern.replace('*', '');
      const matched = [...store.keys()].filter((k) => k.startsWith(prefix));
      return Promise.resolve(matched);
    }),
    quit: jest.fn(() => Promise.resolve()),
  }));
});

import { cacheAside, invalidateCache, closeCacheClient } from '../../cache/redisCache';

describe('redisCache', () => {
  beforeEach(() => {
    store.clear();
  });

  afterAll(async () => {
    await closeCacheClient();
  });

  it('cacheAside returns fetcher result on cache miss', async () => {
    const result = await cacheAside('test:miss', async () => ({ data: 42 }), 60);
    expect(result).toEqual({ data: 42 });
  });

  it('cacheAside returns cached value on hit', async () => {
    await cacheAside('test:hit', async () => 'first', 60);
    const result = await cacheAside('test:hit', async () => 'second', 60);
    expect(result).toBe('first');
  });

  it('cacheAside stores result in cache after fetcher call', async () => {
    await cacheAside('test:store', async () => ({ value: 99 }), 60);
    expect(store.get('test:store')).toBe(JSON.stringify({ value: 99 }));
  });

  it('invalidateCache removes matching keys', async () => {
    store.set('prefix:a', '1');
    store.set('prefix:b', '2');
    store.set('other:c', '3');
    await invalidateCache('prefix:*');
    expect(store.has('prefix:a')).toBe(false);
    expect(store.has('prefix:b')).toBe(false);
    expect(store.has('other:c')).toBe(true);
  });
});

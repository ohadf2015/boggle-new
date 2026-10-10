import { describe, it, expect, vi, beforeEach } from 'vitest';

const SHARED = Symbol.for('lexiclash.redis.shared');

class FakeRedis {
  handlers: Record<string, () => void> = {};
  on(event: string, fn: () => void) { this.handlers[event] = fn; return this; }
  connect = vi.fn(async () => {});
  ping = vi.fn(async () => 'PONG');
  quit = vi.fn(async () => 'OK');
  script = vi.fn(async () => 'sha');
  duplicate() { return new FakeRedis(); }
}

vi.mock('ioredis', () => ({ default: FakeRedis, Redis: FakeRedis }));

describe('shared Redis handle across module registries', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as Record<symbol, unknown>)[SHARED];
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('a second copy of the module sees the client the first copy connected', async () => {
    const serverCopy = await import('../../redis/connection');
    await serverCopy.initRedis();
    const connected = serverCopy.getRedisClient();
    expect(connected).not.toBeNull();

    vi.resetModules();
    const routeCopy = await import('../../redis/connection');
    expect(routeCopy.getRedisClient()).toBeNull();
    expect(routeCopy.getSharedRedisClient()).toBe(connected);

    await serverCopy.closeRedis();
  });

  it('drops the handle when the connection closes', async () => {
    const serverCopy = await import('../../redis/connection');
    await serverCopy.initRedis();
    await serverCopy.closeRedis();
    expect(serverCopy.getSharedRedisClient()).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * One-shot claims behind money (a run's purse, a guest bank). The run token and
 * the guest estate are replayable client state, so "only once" has to live
 * server-side and survive a restart — and when the store is down it must say
 * so, never silently allow.
 */
const store = new Map<string, string>();
let available = true;
vi.mock('@/backend/redis/connection', () => ({
  isRedisAvailable: () => available,
  getRedisClient: () =>
    available
      ? {
          set: async (k: string, v: string, ...args: unknown[]) => {
            if (!args.includes('NX')) throw new Error('claimOnce must use NX');
            if (store.has(k)) return null;
            store.set(k, v);
            return 'OK';
          },
        }
      : null,
}));

import { claimOnce } from '../claimOnce';

describe('claimOnce', () => {
  beforeEach(() => {
    store.clear();
    available = true;
  });

  it('given a fresh key, when claimed twice, then only the first wins', async () => {
    expect(await claimOnce('purse:u1:seed')).toBe('claimed');
    expect(await claimOnce('purse:u1:seed')).toBe('taken');
    expect(await claimOnce('purse:u1:other')).toBe('claimed');
  });

  it('given the store is down, when claimed, then it reports unavailable (the caller fails closed)', async () => {
    available = false;
    expect(await claimOnce('purse:u1:seed')).toBe('unavailable');
  });
});

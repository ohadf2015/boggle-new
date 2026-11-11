import { describe, it, expect, vi } from 'vitest';
import { memoizeFor } from '../memoizeFor';

describe('memoizeFor', () => {
  it('serves a fresh value from memory and refetches after the ttl', async () => {
    const fn = vi.fn(async () => 1);
    const cache = new Map();
    expect(await memoizeFor(cache, 'k', 1000, fn, 0)).toBe(1);
    expect(await memoizeFor(cache, 'k', 1000, fn, 500)).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
    await memoizeFor(cache, 'k', 1000, fn, 1500);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight call between concurrent readers', async () => {
    const fn = vi.fn(async () => 'x');
    const cache = new Map();
    await Promise.all([memoizeFor(cache, 'k', 1000, fn, 0), memoizeFor(cache, 'k', 1000, fn, 0)]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never keeps a failure', async () => {
    const cache = new Map();
    await expect(memoizeFor(cache, 'k', 1000, async () => { throw new Error('boom'); }, 0)).rejects.toThrow('boom');
    expect(await memoizeFor(cache, 'k', 1000, async () => 2, 1)).toBe(2);
  });
});

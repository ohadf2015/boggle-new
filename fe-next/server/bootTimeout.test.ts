import { describe, it, expect, vi } from 'vitest';

import { withBootTimeout } from './bootTimeout';

const silentLog = { error: () => {} };

describe('withBootTimeout', () => {
  it('resolves false when the task completes before the timeout', async () => {
    const task = Promise.resolve('done');
    await expect(withBootTimeout('init', task, 1000, silentLog)).resolves.toBe(false);
  });

  it('resolves true (degraded) when the task exceeds the timeout', async () => {
    // A task that never settles must not hang boot forever.
    const neverSettles = new Promise<void>(() => {});
    await expect(withBootTimeout('init', neverSettles, 20, silentLog)).resolves.toBe(true);
  });

  it('resolves false and logs when the task rejects (never propagates the rejection)', async () => {
    const log = { error: vi.fn() };
    const task = Promise.reject(new Error('redis down'));
    await expect(withBootTimeout('init', task, 1000, log)).resolves.toBe(false);
    expect(log.error).toHaveBeenCalledOnce();
  });
});

// @vitest-environment happy-dom
import { NavigatorLockAcquireTimeoutError } from '@supabase/supabase-js';
import { stealSafeLock } from '../supabase';

function stealDuringFn() {
  const request = vi.fn(async (_name: string, _opts: unknown, cb: (lock: unknown) => Promise<unknown>) => {
    void cb({ name: 'lock:sb' });
    throw new DOMException('Lock was stolen by another request', 'AbortError');
  });
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
}

describe('stealSafeLock', () => {
  it('reports a stolen refresh-tick lock as the timeout error auth-js already skips', async () => {
    stealDuringFn();
    const err = await stealSafeLock('lock:sb', 0, async () => 'x').catch((e) => e);
    expect(err).toBeInstanceOf(NavigatorLockAcquireTimeoutError);
    expect(err.isAcquireTimeout).toBe(true);
  });

  it('still throws a stolen lock unchanged for a caller that waited with a timeout', async () => {
    stealDuringFn();
    const err = await stealSafeLock('lock:sb', -1, async () => 'x').catch((e) => e);
    expect(err.name).toBe('AbortError');
  });

  it('runs the work and returns its result when the lock is free', async () => {
    Object.defineProperty(navigator, 'locks', {
      value: { request: async (_n: string, _o: unknown, cb: (l: unknown) => Promise<unknown>) => cb({ name: 'lock:sb' }) },
      configurable: true,
    });
    await expect(stealSafeLock('lock:sb', 5000, async () => 'done')).resolves.toBe('done');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { validateServiceKeyWithRetry } from '../client';

function makeClient(results: Array<{ error: { message: string; code?: string } | null }>) {
  let call = 0;
  return {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve(results[Math.min(call++, results.length - 1)])
      })
    })
  };
}

describe('validateServiceKeyWithRetry', () => {
  it('retries once on a transient network error, then succeeds', async () => {
    const client = makeClient([
      { error: { message: 'TypeError: fetch failed' } },
      { error: null }
    ]);
    const spy = vi.spyOn(client, 'from');

    const error = await validateServiceKeyWithRetry(client as any, 1, 0);

    expect(error).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not retry on an auth error (401)', async () => {
    const client = makeClient([{ error: { message: '401 Unauthorized' } }]);
    const spy = vi.spyOn(client, 'from');

    const error = await validateServiceKeyWithRetry(client as any, 1, 0);

    expect(error?.message).toBe('401 Unauthorized');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a PGRST301 auth error', async () => {
    const client = makeClient([{ error: { message: 'JWT expired', code: 'PGRST301' } }]);
    const spy = vi.spyOn(client, 'from');

    const error = await validateServiceKeyWithRetry(client as any, 1, 0);

    expect(error?.code).toBe('PGRST301');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('gives up and returns the last error after exhausting retries', async () => {
    const client = makeClient([
      { error: { message: 'TypeError: fetch failed' } },
      { error: { message: 'TypeError: fetch failed' } }
    ]);
    const spy = vi.spyOn(client, 'from');

    const error = await validateServiceKeyWithRetry(client as any, 1, 0);

    expect(error?.message).toBe('TypeError: fetch failed');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

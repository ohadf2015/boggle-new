import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachedAdminJson, clearAdminJsonCache } from '../adminJsonCache';

afterEach(() => {
  clearAdminJsonCache();
  vi.unstubAllGlobals();
});

describe('cachedAdminJson', () => {
  it('shares one request between callers', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });
    vi.stubGlobal('fetch', f);
    const [x, y] = await Promise.all([cachedAdminJson('/u', 't'), cachedAdminJson('/u', 't')]);
    expect(x).toEqual({ a: 1 });
    expect(y).toEqual({ a: 1 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('does not keep a failure', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ a: 2 }) });
    vi.stubGlobal('fetch', f);
    await expect(cachedAdminJson('/u')).rejects.toThrow('HTTP 500');
    await new Promise((r) => setTimeout(r, 0));
    await expect(cachedAdminJson('/u')).resolves.toEqual({ a: 2 });
  });
});

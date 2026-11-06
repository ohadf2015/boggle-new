import { describe, it, expect, vi, afterEach } from 'vitest';
import { freshFetch } from '../supabaseFreshFetch';

describe('freshFetch', () => {
  afterEach(() => vi.restoreAllMocks());

  it('given the app is online, when Supabase reads, then the request skips every HTTP cache', async () => {
    const base = vi.fn().mockResolvedValue(new Response('[]'));
    await freshFetch(base)('https://x.supabase.co/rest/v1/classrooms', { headers: { apikey: 'k' } });
    expect(base).toHaveBeenCalledWith('https://x.supabase.co/rest/v1/classrooms', { headers: { apikey: 'k' }, cache: 'no-store' });
  });

  it('given the device is offline, then the request keeps its own cache setting so a cached read can still show', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const base = vi.fn().mockResolvedValue(new Response('[]'));
    await freshFetch(base)('https://x.supabase.co/rest/v1/profiles', undefined);
    expect(base).toHaveBeenCalledWith('https://x.supabase.co/rest/v1/profiles', undefined);
  });

  it('given no base fetch, then it uses the global fetch at call time', async () => {
    const swapped = vi.fn().mockResolvedValue(new Response('[]'));
    const original = globalThis.fetch;
    globalThis.fetch = swapped as typeof fetch;
    try {
      await freshFetch()('https://x.supabase.co/rest/v1/a');
      expect(swapped).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = original;
    }
  });
});

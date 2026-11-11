import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkPublicName } from '../checkPublicName';

afterEach(() => vi.unstubAllGlobals());

describe('checkPublicName', () => {
  it('Given the server rejects the name, Then the reason comes back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: 'profane' }))));
    expect(await checkPublicName('shit')).toBe('profane');
  });

  it('Given the server accepts it, Then there is no issue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))));
    expect(await checkPublicName('Zigzag')).toBeNull();
  });

  it('Given the check itself fails, Then it does not block (boards still guard server-side)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await checkPublicName('Zigzag')).toBeNull();
  });
});

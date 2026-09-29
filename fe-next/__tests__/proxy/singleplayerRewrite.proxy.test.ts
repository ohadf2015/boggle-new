/**
 * After #1177 excluded /singleplayer from next.config catch-all redirects,
 * production still returned HTTP 301 from proxy.ts (middleware) for bare
 * /singleplayer — middleware runs before beforeFiles rewrites. This keeps the
 * proxy aligned with the beforeFiles rewrite (/en/singleplayer, no hop).
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  })),
}));

const { proxy } = await import('../../proxy');

function makeReq(path: string, init?: { ua?: string; acceptLanguage?: string }) {
  const headers = new Headers({
    'user-agent': init?.ua ?? 'Mozilla/5.0 (compatible; QABot/1.0)',
  });
  if (init?.acceptLanguage) headers.set('accept-language', init.acceptLanguage);
  return new NextRequest(`https://www.lexiclash.live${path}`, { headers });
}

describe('proxy bare /singleplayer rewrite (r7)', () => {
  it('rewrites /singleplayer to /en/singleplayer without redirecting', async () => {
    const res = await proxy(makeReq('/singleplayer'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const rewrite =
      res.headers.get('x-middleware-rewrite') ??
      res.headers.get('x-middleware-next') ??
      '';
    // Next exposes the rewrite target on x-middleware-rewrite
    expect(rewrite).toMatch(/\/en\/singleplayer$/);
  });

  it('rewrites /singleplayer?foo=1 preserving query', async () => {
    const res = await proxy(makeReq('/singleplayer?foo=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/en\/singleplayer\?foo=1$/);
  });

  it('still 301s bare /pricing (locale structure unchanged)', async () => {
    const res = await proxy(makeReq('/pricing'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toMatch(/\/en\/pricing$/);
  });

  it('still 301s bare /multiplayer', async () => {
    const res = await proxy(makeReq('/multiplayer'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toMatch(/\/en\/multiplayer$/);
  });
});

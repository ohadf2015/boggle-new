/**
 * Bare `/` stays a hop-free rewrite for bots (never a redirect). The rewrite
 * must mark the request with x-lc-root-served so the [locale] layout
 * self-canonicalizes the page at `/` and names the root as hreflang x-default
 * — before this, `/` emitted /en's canonical and an hreflang set with no entry
 * for the URL actually served (live audit: "canonical points elsewhere" +
 * "invalid hreflang"). The marker must never leak into a non-root rewrite.
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

function makeReq(path: string, init?: { ua?: string; headers?: Record<string, string> }) {
  const headers = new Headers({
    // A UA the proxy classifies as a bot (see lib/seo/botUa).
    'user-agent': init?.ua ?? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ...init?.headers,
  });
  return new NextRequest(`https://www.lexiclash.live${path}`, { headers });
}

describe('proxy bare-root rewrite marker (x-lc-root-served)', () => {
  it('rewrites / to /en for a bot and marks the request as root-served', async () => {
    const res = await proxy(makeReq('/'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/en$/);
    // Next surfaces rewritten request headers as x-middleware-request-<name>.
    expect(res.headers.get('x-middleware-request-x-lc-root-served')).toBe('en');
  });

  it('overwrites a client-sent copy of the marker on the root rewrite', async () => {
    const res = await proxy(makeReq('/', { headers: { 'x-lc-root-served': 'ru' } }));
    expect(res.headers.get('x-middleware-request-x-lc-root-served')).toBe('en');
  });

  it('does not carry a client-sent marker into a non-root bot rewrite', async () => {
    const res = await proxy(makeReq('/faq', { headers: { 'x-lc-root-served': 'en' } }));
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/en\/faq$/);
    expect(res.headers.get('x-middleware-request-x-lc-root-served')).toBeNull();
  });

  it('still 307s a real browser navigation (no marker needed on a redirect)', async () => {
    const res = await proxy(makeReq('/', {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/en$/);
  });
});

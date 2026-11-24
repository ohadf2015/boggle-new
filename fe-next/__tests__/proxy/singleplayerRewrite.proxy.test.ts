/**
 * Bare /singleplayer stays a hop-free rewrite (no redirect) so FCP is not
 * pinned by an extra hop. The rewrite target is the negotiated locale, not a
 * hard-coded /en. Other unprefixed paths 307 (temporary) to the negotiated
 * locale so browsers do not cache a permanent /en pin.
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

function makeReq(path: string, init?: { ua?: string; acceptLanguage?: string; cookie?: string; country?: string }) {
  const headers = new Headers({
    'user-agent': init?.ua ?? 'Mozilla/5.0 (compatible; QABot/1.0)',
  });
  if (init?.acceptLanguage) headers.set('accept-language', init.acceptLanguage);
  if (init?.cookie) headers.set('cookie', init.cookie);
  if (init?.country) headers.set('cf-ipcountry', init.country);
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

  it('rewrites /singleplayer to /he/singleplayer for a Hebrew Accept-Language', async () => {
    const res = await proxy(makeReq('/singleplayer', { acceptLanguage: 'he-IL,he;q=0.9' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/he\/singleplayer$/);
  });

  it('lets a language cookie win over Accept-Language on /singleplayer', async () => {
    const res = await proxy(makeReq('/singleplayer', {
      acceptLanguage: 'he',
      cookie: 'boggle_language=en',
    }));
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/en\/singleplayer$/);
  });

  it('307s bare /pricing and /multiplayer to the negotiated locale, not a permanent /en', async () => {
    const enPricing = await proxy(makeReq('/pricing'));
    expect(enPricing.status).toBe(307);
    expect(enPricing.headers.get('location')).toMatch(/\/en\/pricing$/);
    expect(enPricing.headers.get('vary')).toMatch(/Accept-Language/i);

    const heMp = await proxy(makeReq('/multiplayer', { acceptLanguage: 'he-IL,he;q=0.9' }));
    expect(heMp.status).toBe(307);
    expect(heMp.headers.get('location')).toMatch(/\/he\/multiplayer$/);

    const cookieWins = await proxy(makeReq('/multiplayer', {
      acceptLanguage: 'he',
      cookie: 'boggle_language=en',
      country: 'IL',
    }));
    expect(cookieWins.status).toBe(307);
    expect(cookieWins.headers.get('location')).toMatch(/\/en\/multiplayer$/);

    const alBeatsCountry = await proxy(makeReq('/multiplayer', {
      acceptLanguage: 'en-US,en;q=0.9',
      country: 'IL',
    }));
    expect(alBeatsCountry.headers.get('location')).toMatch(/\/en\/multiplayer$/);
  });

  it('rewrites unprefixed paths for crawlers instead of redirecting them', async () => {
    const res = await proxy(makeReq('/multiplayer', { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const rewrite = res.headers.get('x-middleware-rewrite') ?? '';
    expect(rewrite).toMatch(/\/en\/multiplayer$/);
  });
});

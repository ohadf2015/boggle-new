/**
 * Bare /singleplayer must be an internal rewrite to /en/singleplayer, not the
 * catch-all 308 redirect. PSI (and real visitors) save a full round trip before
 * any render-blocking resource can start; in Lighthouse's Lantern model the 308
 * hop sat in the critical path and pinned simulated FCP at ~1803ms (r4/r5).
 *
 * Next.js order is Headers → Redirects → Middleware (proxy.ts) → beforeFiles
 * rewrites → filesystem. The catch-all permanent redirect MUST exclude
 * `singleplayer`, or it 308s before the rewrite (post-#1176). After that
 * exclusion, proxy.ts must also rewrite (not 301) — see r7 follow-up.
 * Refs: r6 / #1177 / t_dfd64604.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;

describe('/singleplayer rewrite (r6 follow-up)', () => {
  it('rewrites /singleplayer to /en/singleplayer in beforeFiles', async () => {
    const rewrites = await (nextConfig as { rewrites?: () => Promise<unknown> }).rewrites?.();
    const beforeFiles = (rewrites as { beforeFiles?: Array<{ source: string; destination: string }> })
      ?.beforeFiles;

    expect(beforeFiles, 'rewrites() must return { beforeFiles }').toBeDefined();
    const rule = beforeFiles!.find((r) => r.source === '/singleplayer');
    expect(rule, 'no beforeFiles rewrite for /singleplayer').toBeDefined();
    expect(rule!.destination).toBe('/en/singleplayer');
  });

  it('catch-all locale redirects exclude singleplayer so the rewrite can win', async () => {
    const redirects = await (nextConfig as {
      redirects?: () => Promise<Array<{ source: string; destination: string; permanent?: boolean }>>;
    }).redirects?.();

    // Flat catch-all: /:path → /en/:path
    const flat = (redirects ?? []).find(
      (r) => r.destination === '/en/:path' && r.source.includes(':path'),
    );
    expect(flat, 'flat catch-all /en/:path redirect missing').toBeDefined();
    expect(flat!.source).toMatch(/singleplayer/);
    // Negative-lookahead style exclusion (same family as en|he|…).
    expect(flat!.source).toMatch(/\(\?!.*singleplayer/);
    expect(flat!.permanent).toBe(true);

    // Nested catch-all: /:path/:rest* → /en/:path/:rest*
    const nested = (redirects ?? []).find(
      (r) => r.destination === '/en/:path/:rest*' && r.source.includes(':rest*'),
    );
    expect(nested, 'nested catch-all /en/:path/:rest* redirect missing').toBeDefined();
    expect(nested!.source).toMatch(/singleplayer/);
    expect(nested!.source).toMatch(/\(\?!.*singleplayer/);
    expect(nested!.permanent).toBe(true);
  });
});

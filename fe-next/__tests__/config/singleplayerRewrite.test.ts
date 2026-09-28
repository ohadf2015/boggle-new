/**
 * Bare /singleplayer must be an internal rewrite to /en/singleplayer, not the
 * catch-all 308 redirect. PSI (and real visitors) save a full round trip before
 * any render-blocking resource can start; in Lighthouse's Lantern model the 308
 * hop sat in the critical path and pinned simulated FCP at ~1803ms (r4/r5).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;

describe('/singleplayer rewrite (r6)', () => {
  it('rewrites /singleplayer to /en/singleplayer in beforeFiles', async () => {
    const rewrites = await (nextConfig as { rewrites?: () => Promise<unknown> }).rewrites?.();
    const beforeFiles = (rewrites as { beforeFiles?: Array<{ source: string; destination: string }> })
      ?.beforeFiles;

    expect(beforeFiles, 'rewrites() must return { beforeFiles }').toBeDefined();
    const rule = beforeFiles!.find((r) => r.source === '/singleplayer');
    expect(rule, 'no beforeFiles rewrite for /singleplayer').toBeDefined();
    expect(rule!.destination).toBe('/en/singleplayer');
  });

  it('the catch-all bare-path 308 to /en/:path still exists (so the rewrite is what saves the hop)', async () => {
    const redirects = await (nextConfig as {
      redirects?: () => Promise<Array<{ source: string; destination: string }>>;
    }).redirects?.();

    // Next.js runs beforeFiles rewrites BEFORE redirects, so this catch-all
    // 308 (/singleplayer -> /en/singleplayer) only fires for paths without a
    // beforeFiles rule. Guard the redirect so a future cleanup can't delete
    // the reason the rewrite matters — or worse, leave both gone.
    const catchAll = (redirects ?? []).find(
      (r) => r.destination === '/en/:path' && r.source.includes(':path'),
    );
    expect(catchAll, 'catch-all /en/:path redirect missing — update this test').toBeDefined();
  });
});

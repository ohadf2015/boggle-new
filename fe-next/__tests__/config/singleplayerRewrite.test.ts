/**
 * Locale negotiation for unprefixed paths lives in proxy.ts, not in a static
 * next.config redirect to /en. A permanent catch-all ran BEFORE middleware and
 * pinned every /multiplayer (and similar) visit to English, ignoring
 * Accept-Language and the language cookie. /singleplayer is a hop-free rewrite
 * in proxy.ts to the negotiated locale.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;

describe('unprefixed paths are not statically pinned to /en', () => {
  it('does not rewrite /singleplayer to a hard-coded /en/singleplayer', async () => {
    const rewrites = await (nextConfig as { rewrites?: () => Promise<unknown> }).rewrites?.();
    const beforeFiles = (rewrites as { beforeFiles?: Array<{ source: string; destination: string }> })
      ?.beforeFiles;

    expect(beforeFiles, 'rewrites() must return { beforeFiles }').toBeDefined();
    const rule = beforeFiles!.find((r) => r.source === '/singleplayer');
    expect(rule).toBeUndefined();
  });

  it('has no catch-all locale redirect to /en/:path', async () => {
    const redirects = await (nextConfig as {
      redirects?: () => Promise<Array<{ source: string; destination: string; permanent?: boolean }>>;
    }).redirects?.();

    const catchAlls = (redirects ?? []).filter((r) => r.destination.startsWith('/en/:path'));
    expect(catchAlls).toEqual([]);

    const root = (redirects ?? []).find((r) => r.source === '/' && r.destination === '/en');
    expect(root).toBeUndefined();
  });
});

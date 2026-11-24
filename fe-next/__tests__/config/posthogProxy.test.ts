/**
 * The first-party PostHog path must survive every layer in front of Next's rewrites:
 * the Express gate and proxy.ts. The static /en catch-all redirects were removed
 * so locale negotiation can run in proxy.ts.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default as {
  rewrites: () => Promise<{ beforeFiles: Array<{ source: string; destination: string }> }>;
  redirects: () => Promise<Array<{ source: string; destination: string }>>;
};

describe('PostHog proxy at /lcx', () => {
  it('rewrites /lcx to PostHog EU before the filesystem', async () => {
    const { beforeFiles } = await nextConfig.rewrites();
    expect(beforeFiles.find((r) => r.source === '/lcx/:path*')?.destination).toBe('https://eu.i.posthog.com/:path*');
    expect(beforeFiles.find((r) => r.source === '/lcx/static/:path*')?.destination).toBe('https://eu-assets.i.posthog.com/static/:path*');
  });

  it('is not caught by any leftover /en catch-all redirects', async () => {
    const catchAlls = (await nextConfig.redirects()).filter((r) => r.destination.startsWith('/en/:path'));
    expect(catchAlls).toEqual([]);
  });
});

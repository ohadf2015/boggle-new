/**
 * Apple fetches the app-site-association file from exactly one URL:
 *
 *   https://<domain>/.well-known/apple-app-site-association
 *
 * It does not follow redirects and it does not look anywhere else. The handler
 * lives at `app/api/.well-known/apple-app-site-association/route.ts`, which the
 * App Router serves at `/api/.well-known/...` — so without a rewrite the file
 * Apple asks for is a 404 and Universal Links never validate, which is what
 * production was doing. The handler's own tests passed the whole time because
 * they call GET() directly and never assert the URL it is reachable at.
 */
import { vi } from 'vitest';

// next.config.mjs wraps its export in withSentryConfig; the global test setup
// mocks @sentry/nextjs without that export, so re-mock it as a pass-through.
vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;

const AASA_PATH = '/.well-known/apple-app-site-association';

describe('.well-known rewrites', () => {
  it('serves the AASA file at the path Apple actually fetches', async () => {
    const rewrites = await (nextConfig as { rewrites?: () => Promise<unknown> }).rewrites?.();

    // rewrites() may return an array or a {beforeFiles,afterFiles,fallback} object.
    const rules = (Array.isArray(rewrites)
      ? rewrites
      : [
          ...((rewrites as { beforeFiles?: unknown[] })?.beforeFiles ?? []),
          ...((rewrites as { afterFiles?: unknown[] })?.afterFiles ?? []),
          ...((rewrites as { fallback?: unknown[] })?.fallback ?? []),
        ]) as Array<{ source: string; destination: string }>;

    const aasa = rules.find((r) => r.source === AASA_PATH);

    expect(aasa, `no rewrite for ${AASA_PATH}`).toBeDefined();
    expect(aasa!.destination).toBe('/api/.well-known/apple-app-site-association');
  });

  it('does not redirect the AASA path away from the domain (Apple will not follow it)', async () => {
    const redirects = await (nextConfig as { redirects?: () => Promise<Array<{ source: string }>> }).redirects?.();

    // The apex→www redirect uses a negative lookahead to exempt verification
    // files; the AASA path must be exempt too or Apple gets a 308 and gives up.
    const apexRedirect = (redirects ?? []).find((r) => r.source.includes('assetlinks'));
    expect(apexRedirect, 'apex→www redirect not found — update this test').toBeDefined();
    expect(apexRedirect!.source).toContain('apple-app-site-association');
  });
});

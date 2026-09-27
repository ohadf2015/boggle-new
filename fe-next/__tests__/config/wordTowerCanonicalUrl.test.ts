/**
 * Word Tower canonical URL configuration test.
 *
 * The canonical public URL is /[locale]/word-tower (clean, no "v2"): the v2
 * game's route lives there directly (no rewrite). Legacy /word-tower-v2 and
 * /daily/word-tower URLs 308 to it in one hop, and nothing redirects AWAY
 * from /word-tower (that would loop).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('@posthog/nextjs-config', () => ({
  withPostHogConfig: (config: unknown) => config,
}));

const nextConfig = (await import('../../next.config.mjs')).default;

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Rule = { source: string; destination: string; permanent?: boolean };

const redirects = (await nextConfig.redirects()) as Rule[];
const rewritesRaw = await nextConfig.rewrites();
const rewrites: Rule[] = Array.isArray(rewritesRaw)
  ? rewritesRaw
  : [...(rewritesRaw.beforeFiles ?? []), ...(rewritesRaw.afterFiles ?? []), ...(rewritesRaw.fallback ?? [])];

const find = (source: string) => redirects.find((r) => r.source === source);

describe('Word Tower canonical URL', () => {
  it.each([
    ['/:locale(en|he|sv|ja|es|ru)/word-tower-v2', '/:locale/word-tower'],
    ['/:locale(en|he|sv|ja|es|ru)/word-tower-v2/daily', '/:locale/word-tower/daily'],
    ['/:locale(en|he|sv|ja|es|ru)/daily/word-tower', '/:locale/word-tower/daily'],
    ['/daily/word-tower', '/en/word-tower/daily'],
  ])('permanently redirects %s -> %s', (source, destination) => {
    expect(find(source)).toMatchObject({ destination, permanent: true });
  });

  it('never redirects or rewrites the canonical /word-tower paths (no loop, no hidden -v2)', () => {
    const canonical = /^\/:locale[^/]*\/word-tower(\/daily)?$/;
    expect(redirects.filter((r) => canonical.test(r.source))).toEqual([]);
    expect(rewrites.filter((r) => /word-tower/.test(r.source))).toEqual([]);
  });

  it('serves the game from app/[locale]/word-tower and no -v2 route remains', () => {
    const app = resolve(__dirname, '../../app/[locale]');
    expect(existsSync(`${app}/word-tower/page.tsx`)).toBe(true);
    expect(existsSync(`${app}/word-tower/daily/page.tsx`)).toBe(true);
    expect(existsSync(`${app}/word-tower-v2`)).toBe(false);
  });
});

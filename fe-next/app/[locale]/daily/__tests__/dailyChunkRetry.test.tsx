import { describe, it, expect, vi, beforeEach } from 'vitest';

// The daily-mode pages lazy-load their game chunk with next/dynamic. A stale
// deploy (or a flaky mobile network) makes that chunk 404 with a ChunkLoadError,
// which left the loading fallback on screen forever — the unhandled failure
// reported on /he/daily/word-wheel. Each page must wrap its import factory with
// retryImport so a transient/stale chunk load retries and then recovers.

const retryImport = vi.fn((factory: () => Promise<unknown>) => factory);
vi.mock('@/utils/retryImport', () => ({ retryImport }));

const dynamicDefault = vi.fn(() => () => null);
vi.mock('next/dynamic', () => ({ default: dynamicDefault }));

beforeEach(() => {
  retryImport.mockClear();
  dynamicDefault.mockClear();
  vi.resetModules();
});

describe('daily-mode pages harden their lazy game-chunk load', () => {
  it.each([
    ['word-wheel', () => import('../word-wheel/page')],
    ['word-hunt', () => import('../word-hunt/page')],
    ['daily hub', () => import('../page')],
  ])('%s routes its game chunk through retryImport', async (_name, load) => {
    await load();

    expect(retryImport).toHaveBeenCalledTimes(1);
    expect(retryImport.mock.calls[0][0]).toBeTypeOf('function');

    // The hardened loader — not the raw import factory — is what next/dynamic gets.
    expect(dynamicDefault.mock.calls[0][0]).toBe(retryImport.mock.results[0].value);
  });
});

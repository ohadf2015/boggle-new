import { describe, it, expect, vi, beforeEach } from 'vitest';

// /en/singleplayer is ssr:false (the board cannot SSR). A stale-deploy or
// flaky-network ChunkLoadError on any of the ~45 webpack splits left
// "Loading single player..." on screen forever. Wrap the factory with
// retryImport so it retries and then cache-busts, matching /daily/word-hunt.

const retryImport = vi.fn((factory: () => Promise<unknown>) => factory);
vi.mock('@/utils/retryImport', () => ({ retryImport }));

const dynamicDefault = vi.fn(() => () => null);
vi.mock('next/dynamic', () => ({ default: dynamicDefault }));

vi.mock('@/components/ChunkErrorBoundary', () => ({
  ChunkErrorBoundary: ({ children }: { children: unknown }) => children,
}));

beforeEach(() => {
  retryImport.mockClear();
  dynamicDefault.mockClear();
  vi.resetModules();
});

describe('singleplayer page hardens its lazy game-chunk load', () => {
  it('routes SinglePlayerView through retryImport', async () => {
    await import('../PageClient');

    expect(retryImport).toHaveBeenCalled();
    const factories = retryImport.mock.calls.map((c) => c[0]);
    expect(factories.some((f) => typeof f === 'function')).toBe(true);

    const viewCall = dynamicDefault.mock.calls.find((c) => {
      const opts = c[1] as { ssr?: boolean; loading?: unknown } | undefined;
      return opts && opts.ssr === false && typeof opts.loading === 'function';
    });
    expect(viewCall, 'SinglePlayerView next/dynamic(ssr:false, loading)').toBeTruthy();
    expect(viewCall![0]).toBe(retryImport.mock.results[0].value);

    const hangOpts = retryImport.mock.calls.find((c) => {
      const opts = c[1] as { timeoutMs?: number } | undefined;
      return opts && opts.timeoutMs === 10_000;
    });
    expect(hangOpts, 'retryImport hang-timeout 10s on SinglePlayerView').toBeTruthy();
  });
});

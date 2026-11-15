import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/sentry/clientInit', () => ({}));
vi.mock('@sentry/nextjs', () => {
  throw Object.assign(new Error('Loading chunk 80564 failed.'), { name: 'ChunkLoadError' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSentry when the SDK chunk is gone after a deploy', () => {
  it('never rejects, so callers raise no unhandled rejection and skip their capture', async () => {
    const { loadSentry, getLoadedSentry } = await import('../sentryLazy');
    const onRejection = vi.fn();
    process.on('unhandledRejection', onRejection);
    const capture = vi.fn();

    void loadSentry().then(capture);
    void loadSentry().then(capture);
    await new Promise((r) => setTimeout(r, 20));
    process.off('unhandledRejection', onRejection);

    expect(onRejection).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(getLoadedSentry()).toBeNull();
  });
});

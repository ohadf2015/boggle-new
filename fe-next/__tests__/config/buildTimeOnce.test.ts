import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ withSentryConfig: (config: object) => config }));

describe('build time', () => {
  it('Given a build worker re-evaluates next.config with the parent env, Then every compilation bakes the same build time', async () => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
    const first = (await import('../../next.config.mjs?a')).default.env.NEXT_PUBLIC_BUILD_TIME;
    await new Promise((r) => setTimeout(r, 5));
    const second = (await import('../../next.config.mjs?b')).default.env.NEXT_PUBLIC_BUILD_TIME;
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });
});

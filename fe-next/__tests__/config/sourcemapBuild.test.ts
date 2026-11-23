import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('POSTHOG_API_KEY', 'phx_test');
vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: object) => ({
    ...config,
    webpack: (c: object) => ({ ...c, devtool: 'hidden-source-map' }),
  }),
}));

const nextConfig = (await import('../../next.config.mjs')).default;
const ctx = (isServer: boolean) => ({ isServer, dev: false });

describe('source map build', () => {
  it('keeps client maps and drops server maps', () => {
    expect(nextConfig.webpack({ context: process.cwd() }, ctx(false)).devtool).toBe('hidden-source-map');
    expect(nextConfig.webpack({ context: process.cwd() }, ctx(true)).devtool).toBe(false);
  });

  it('uploads to PostHog after the compile when its key is set', () => {
    expect(typeof nextConfig.compiler.runAfterProductionCompile).toBe('function');
  });
});

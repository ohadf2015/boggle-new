import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ChunkErrorBoundary } from '../ChunkErrorBoundary';
import { FeatureErrorBoundary, BaseErrorBoundary } from '../ErrorBoundaries';
import { clearChunkRecoveryGuard } from '@/lib/deploy/staleDeployReload';

const replaceSpy = vi.fn();

function setPath(pathname: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: `https://lexiclash.live${pathname}`, pathname, search: '', reload: vi.fn(), replace: replaceSpy },
  });
}

function Boom(): React.ReactElement {
  throw Object.assign(new Error('Loading chunk 2703 failed.'), { name: 'ChunkLoadError' });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BUILD_TIME', 'build-A');
  clearChunkRecoveryGuard();
  replaceSpy.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [], delete: async () => true } });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [] } });
});
afterEach(() => {
  cleanup();
  clearChunkRecoveryGuard();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const boundaries: Array<[string, (children: React.ReactNode) => React.ReactElement]> = [
  ['ChunkErrorBoundary', (c) => <ChunkErrorBoundary>{c}</ChunkErrorBoundary>],
  ['FeatureErrorBoundary', (c) => <FeatureErrorBoundary featureName="Game">{c}</FeatureErrorBoundary>],
  ['BaseErrorBoundary', (c) => <BaseErrorBoundary>{c}</BaseErrorBoundary>],
];

describe.each(boundaries)('%s after a deploy', (_name, wrap) => {
  it('Given a running multiplayer game, When a chunk fails inside it, Then the page is not reloaded', async () => {
    setPath('/en/multiplayer');
    render(wrap(<Boom />));
    await flush();
    await flush();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('Given an ordinary page, When a chunk fails, Then it reloads once with fresh files', async () => {
    setPath('/en/daily');
    render(wrap(<Boom />));
    await vi.waitFor(() => expect(replaceSpy).toHaveBeenCalledTimes(1));
  });
});

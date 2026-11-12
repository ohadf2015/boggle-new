import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

const clearCachesAndReload = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/utils/sentry', () => ({ captureError: vi.fn() }));
vi.mock('@/translations/loadTranslation', () => ({
  getCachedTranslation: () => ({ errors: { errorHeading: 'Oops' }, common: { retry: 'Retry', back: 'Back' } }),
}));
vi.mock('@/lib/deploy/staleDeployReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/deploy/staleDeployReload')>()),
  clearCachesAndReload,
}));

import BlastError from '../error';
import { clearChunkRecoveryGuard } from '@/lib/deploy/staleDeployReload';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BUILD_TIME', 'build-A');
  clearChunkRecoveryGuard();
  clearCachesAndReload.mockClear();
});
afterEach(() => {
  cleanup();
  clearChunkRecoveryGuard();
  vi.unstubAllEnvs();
});

describe('Blast error boundary after a deploy', () => {
  it('Given a first stale chunk, When the boundary renders, Then it reloads once and shows Update ready with a way back', () => {
    render(<BlastError error={Object.assign(new Error('Loading chunk 9 failed'), { name: 'ChunkLoadError' })} reset={vi.fn()} />);
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Update ready');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('Given an ordinary crash, When the boundary renders, Then the usual screen shows and nothing reloads', () => {
    render(<BlastError error={new Error('boom')} reset={vi.fn()} />);
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Oops');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

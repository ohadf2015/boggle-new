import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const clearCachesAndReload = vi.hoisted(() => vi.fn(async () => undefined));
const captureError = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useParams: () => ({ locale: 'en' }) }));
vi.mock('@/utils/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
vi.mock('@/translations/loadTranslation', () => ({ getCachedTranslation: () => undefined }));
vi.mock('@/lib/deploy/staleDeployReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/deploy/staleDeployReload')>()),
  clearCachesAndReload,
}));

import { EduRouteError } from '../EduRouteError';
import { CHUNK_RECOVERY_GUARD_KEY, CHUNK_RELOAD_WINDOW_MARK, clearChunkRecoveryGuard } from '@/lib/deploy/staleDeployReload';

function chunkError(): Error {
  return Object.assign(new Error('Loading chunk 4821 failed.'), { name: 'ChunkLoadError' });
}

beforeEach(() => {
  clearChunkRecoveryGuard();
  clearCachesAndReload.mockClear();
  captureError.mockReset();
});
afterEach(() => {
  cleanup();
  clearChunkRecoveryGuard();
});

describe('<EduRouteError> after a deploy left the page with stale chunks', () => {
  it('Given the first chunk failure of the page session, When the boundary renders, Then it reloads once with fresh assets', () => {
    render(<EduRouteError error={chunkError()} reset={vi.fn()} boundary="join" area="join" />);
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe('true');
  });

  it('Given a chunk failure named only by its message, When the boundary renders, Then it is treated as a stale chunk too', () => {
    render(<EduRouteError error={new TypeError('Failed to fetch dynamically imported module: /_next/static/chunks/a.js')} reset={vi.fn()} boundary="teacher" area="teacher" />);
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });

  it('Given the automatic reload already happened, When the chunk fails again, Then it does not reload and offers an update action', () => {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, 'true');
    render(<EduRouteError error={chunkError()} reset={vi.fn()} boundary="join" area="join" />);
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Update ready');
    expect(screen.queryByText('This screen hit a snag')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });

  it('Given the second failure, When it renders, Then the guard stays claimed so a later failure cannot loop', () => {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, 'true');
    render(<EduRouteError error={chunkError()} reset={vi.fn()} boundary="join" area="join" />);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe('true');
  });

  it('Given sessionStorage is blocked and the page already reloaded once, When the chunk fails again, Then it does not reload and offers the update action', () => {
    const real = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
    window.name = CHUNK_RELOAD_WINDOW_MARK;
    try {
      render(<EduRouteError error={chunkError()} reset={vi.fn()} boundary="join" area="join" />);
      expect(clearCachesAndReload).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Update ready');
    } finally {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, value: real });
      window.name = '';
    }
  });

  it('Given the live game room, When a chunk fails for the first time, Then it never reloads by itself and shows the update action', () => {
    render(<EduRouteError error={chunkError()} reset={vi.fn()} boundary="edu-live" area="live" />);
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Update ready');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });

  it('Given an ordinary crash, When the boundary renders, Then nothing reloads, the crash is reported and Try again resets', () => {
    const reset = vi.fn();
    const error = new Error('boom');
    render(<EduRouteError error={error} reset={reset} boundary="join" area="join" />);
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(captureError).toHaveBeenCalledWith(error, expect.anything());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This screen hit a snag');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(clearCachesAndReload).not.toHaveBeenCalled();
  });
});

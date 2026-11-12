import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';

const clearCachesAndReload = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/lib/deploy/staleDeployReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/deploy/staleDeployReload')>()),
  clearCachesAndReload,
}));

import { useStaleDeployRecovery } from '../useStaleDeployRecovery';
import {
  CHUNK_RECOVERY_GUARD_KEY,
  CHUNK_RELOAD_PARAM,
  CHUNK_RELOAD_WINDOW_MARK,
  clearChunkRecoveryGuard,
} from '@/lib/deploy/staleDeployReload';

const BUILD = '2026-11-12T08:00:00.000Z';

function chunkError(): Error {
  return Object.assign(new Error('Loading chunk 4821 failed.'), { name: 'ChunkLoadError' });
}

function blockSessionStorage(): () => void {
  const real = window.sessionStorage;
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  return () => Object.defineProperty(window, 'sessionStorage', { configurable: true, value: real });
}

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BUILD_TIME', BUILD);
  clearChunkRecoveryGuard();
  window.history.replaceState(null, '', '/');
  setOnline(true);
  clearCachesAndReload.mockClear();
});
afterEach(() => {
  clearChunkRecoveryGuard();
  window.history.replaceState(null, '', '/');
  setOnline(true);
  vi.unstubAllEnvs();
});

describe('useStaleDeployRecovery', () => {
  it('Given a stale chunk and no earlier reload, When the boundary mounts, Then it reloads once and marks this build', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('reloading');
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe(BUILD);
  });

  it('Given the reload landed on the same build, When the chunk fails again, Then it shows update-ready and keeps the mark', () => {
    renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    clearCachesAndReload.mockClear();
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('update-ready');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe(BUILD);
  });

  it('Given the tab reloaded for an older build, When a later deploy breaks a chunk, Then it reloads once again', () => {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, '2026-11-01T00:00:00.000Z');
    window.name = `${CHUNK_RELOAD_WINDOW_MARK}@2026-11-01T00:00:00.000Z;`;
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('reloading');
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe(BUILD);
  });

  it('Given the running build cannot be read, When a chunk fails, Then it fails safe to update-ready with no reload', () => {
    vi.stubEnv('NEXT_PUBLIC_BUILD_TIME', '');
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('update-ready');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('Given a live game area, When a chunk fails for the first time, Then it is update-ready immediately and never reloads by itself', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: false }));
    expect(result.current.state).toBe('update-ready');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
  });

  it.each(['/en/multiplayer?room=AB12', '/he/education/live/host', '/es/education/duels/42'])(
    'Given the page is the live game path %s, When a boundary asks for auto reload, Then the shared predicate still holds it back',
    (path) => {
      window.history.replaceState(null, '', path);
      const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
      expect(result.current.state).toBe('update-ready');
      expect(clearCachesAndReload).not.toHaveBeenCalled();
    },
  );

  it('Given the browser is offline, When a dynamic import fails, Then it is a connection problem: not-stale, no reload, guard untouched', () => {
    setOnline(false);
    const error = new TypeError('Failed to fetch dynamically imported module: /_next/static/chunks/a.js');
    const { result } = renderHook(() => useStaleDeployRecovery(error, { autoReload: true }));
    expect(result.current.state).toBe('not-stale');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBeNull();
  });

  it('Given an ordinary crash, When the boundary mounts, Then it is not-stale and nothing happens', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(new Error('boom'), { autoReload: true }));
    expect(result.current.state).toBe('not-stale');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBeNull();
  });

  it('Given blocked sessionStorage and the window.name mark for this build, When the chunk fails again, Then it does not reload', () => {
    const restore = blockSessionStorage();
    window.name = `${CHUNK_RELOAD_WINDOW_MARK}@${BUILD};`;
    try {
      const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
      expect(result.current.state).toBe('update-ready');
      expect(clearCachesAndReload).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('Given blocked sessionStorage and the cache-bust param on the address, When the chunk fails again, Then it does not reload a second time', () => {
    const restore = blockSessionStorage();
    window.history.replaceState(null, '', `/en/blast?${CHUNK_RELOAD_PARAM}=1`);
    try {
      const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
      expect(result.current.state).toBe('update-ready');
      expect(clearCachesAndReload).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('Given the update-ready state, When the player taps Refresh, Then it fetches fresh files through the cache-busting reload', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: false }));
    act(() => result.current.refresh());
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });

  it('Given the same error re-renders, When the boundary updates, Then it never reloads twice', () => {
    const error = chunkError();
    const { rerender } = renderHook(() => useStaleDeployRecovery(error, { autoReload: true }));
    rerender();
    rerender();
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });

  it('Given StrictMode runs the effect twice, When this mount started the reload, Then it stays reloading', () => {
    const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    const error = chunkError();
    const { result } = renderHook(() => useStaleDeployRecovery(error, { autoReload: true }), { wrapper });
    expect(result.current.state).toBe('reloading');
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
  });
});

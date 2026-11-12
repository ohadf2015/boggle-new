import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

function chunkError(): Error {
  return Object.assign(new Error('Loading chunk 4821 failed.'), { name: 'ChunkLoadError' });
}

function blockSessionStorage(): () => void {
  const real = window.sessionStorage;
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  return () => Object.defineProperty(window, 'sessionStorage', { configurable: true, value: real });
}

beforeEach(() => {
  clearChunkRecoveryGuard();
  window.history.replaceState(null, '', '/');
  clearCachesAndReload.mockClear();
});
afterEach(() => {
  clearChunkRecoveryGuard();
  window.history.replaceState(null, '', '/');
});

describe('useStaleDeployRecovery', () => {
  it('Given a stale chunk and no earlier reload, When the boundary mounts, Then it reloads once with fresh files', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('reloading');
    expect(clearCachesAndReload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe('true');
  });

  it('Given the tab already reloaded once, When the chunk fails again, Then it shows update-ready, does not reload, and keeps the guard', () => {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, 'true');
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: true }));
    expect(result.current.state).toBe('update-ready');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBe('true');
  });

  it('Given a live game area, When a chunk fails for the first time, Then it is update-ready immediately and never reloads by itself', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(chunkError(), { autoReload: false }));
    expect(result.current.state).toBe('update-ready');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('Given an ordinary crash, When the boundary mounts, Then it is not-stale and nothing happens', () => {
    const { result } = renderHook(() => useStaleDeployRecovery(new Error('boom'), { autoReload: true }));
    expect(result.current.state).toBe('not-stale');
    expect(clearCachesAndReload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY)).toBeNull();
  });

  it('Given blocked sessionStorage and the window.name mark, When the chunk fails again, Then it does not reload a second time', () => {
    const restore = blockSessionStorage();
    window.name = CHUNK_RELOAD_WINDOW_MARK;
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
});

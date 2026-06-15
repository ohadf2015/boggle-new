import { describe, it, expect, vi } from 'vitest';
import {
  isChunkLoadError,
  shouldReloadForStaleDeploy,
  recoverFromStaleChunk,
  CHUNK_RECOVERY_GUARD_KEY,
} from '../staleDeployReload';

describe('isChunkLoadError', () => {
  it('matches the ChunkLoadError error name', () => {
    expect(isChunkLoadError('ChunkLoadError', 'whatever')).toBe(true);
  });

  it('matches "Loading chunk N failed" messages', () => {
    expect(isChunkLoadError('Error', 'Loading chunk 482 failed.')).toBe(true);
  });

  it('matches dynamic-import rejection messages from next/dynamic', () => {
    expect(
      isChunkLoadError('TypeError', 'Failed to fetch dynamically imported module: https://x/_next/static/chunks/abc.js'),
    ).toBe(true);
  });

  it('matches a stale _next/static/chunks asset url', () => {
    expect(isChunkLoadError(undefined, 'GET /_next/static/chunks/09jwx121_zavy.js 404')).toBe(true);
  });

  it('matches the CommonJS "module is not defined" ReferenceError', () => {
    expect(isChunkLoadError('ReferenceError', 'module is not defined')).toBe(true);
  });

  it('does NOT match unrelated runtime errors', () => {
    expect(isChunkLoadError('TypeError', "Cannot read properties of undefined (reading 'x')")).toBe(false);
  });

  it('does NOT match a bare "failed to fetch" with no chunk/module context', () => {
    expect(isChunkLoadError('TypeError', 'Failed to fetch')).toBe(false);
  });
});

describe('shouldReloadForStaleDeploy', () => {
  it('reloads when client and server build times differ', () => {
    expect(
      shouldReloadForStaleDeploy({ clientBuildTime: 'A', serverBuildTime: 'B', alreadyReloaded: false }),
    ).toBe(true);
  });

  it('does not reload when build times match (genuine error on a fresh build)', () => {
    expect(
      shouldReloadForStaleDeploy({ clientBuildTime: 'A', serverBuildTime: 'A', alreadyReloaded: false }),
    ).toBe(false);
  });

  it('does not reload when a build time is missing (fail-safe on uncertainty)', () => {
    expect(
      shouldReloadForStaleDeploy({ clientBuildTime: undefined, serverBuildTime: 'B', alreadyReloaded: false }),
    ).toBe(false);
    expect(
      shouldReloadForStaleDeploy({ clientBuildTime: 'A', serverBuildTime: undefined, alreadyReloaded: false }),
    ).toBe(false);
  });

  it('does not reload when already reloaded once (loop backstop)', () => {
    expect(
      shouldReloadForStaleDeploy({ clientBuildTime: 'A', serverBuildTime: 'B', alreadyReloaded: true }),
    ).toBe(false);
  });
});

describe('recoverFromStaleChunk', () => {
  const baseDeps = () => ({
    clientBuildTime: 'CLIENT',
    fetchServerBuildTime: vi.fn(async () => 'SERVER'),
    getGuard: vi.fn(() => false),
    setGuard: vi.fn(),
    clearCachesAndReload: vi.fn(async () => {}),
  });

  it('reloads once on a stale deploy (version mismatch)', async () => {
    const deps = baseDeps();
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(true);
    expect(deps.setGuard).toHaveBeenCalledOnce();
    expect(deps.clearCachesAndReload).toHaveBeenCalledOnce();
  });

  it('does NOT reload when build times match (fresh build)', async () => {
    const deps = { ...baseDeps(), fetchServerBuildTime: vi.fn(async () => 'CLIENT') };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(false);
    expect(deps.clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('does NOT reload when the version fetch fails (fail-safe)', async () => {
    const deps = {
      ...baseDeps(),
      fetchServerBuildTime: vi.fn(async () => {
        throw new Error('network down');
      }),
    };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(false);
    expect(deps.clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('does NOT reload (or re-fetch) when the guard is already set', async () => {
    const deps = { ...baseDeps(), getGuard: vi.fn(() => true) };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(false);
    expect(deps.fetchServerBuildTime).not.toHaveBeenCalled();
    expect(deps.clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('exposes the shared guard key reused across error boundaries', () => {
    expect(CHUNK_RECOVERY_GUARD_KEY).toBe('chunk_error_refresh');
  });
});

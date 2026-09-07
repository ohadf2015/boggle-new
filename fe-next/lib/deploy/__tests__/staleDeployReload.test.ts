import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isChunkLoadError,
  shouldReloadForStaleDeploy,
  shouldReloadForMissingChunk,
  recoverFromStaleChunk,
  hardNavigateCacheBust,
  stripChunkReloadParam,
  CHUNK_RECOVERY_GUARD_KEY,
  CHUNK_RELOAD_PARAM,
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

describe('shouldReloadForMissingChunk', () => {
  it('reloads when the guard is clear', () => {
    expect(shouldReloadForMissingChunk({ alreadyReloaded: false })).toBe(true);
  });

  it('does not reload when already reloaded', () => {
    expect(shouldReloadForMissingChunk({ alreadyReloaded: true })).toBe(false);
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

  it('reloads once on a stale deploy (version mismatch) when force is off', async () => {
    const deps = { ...baseDeps(), forceOnChunkFailure: false };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(true);
    expect(deps.setGuard).toHaveBeenCalledOnce();
    expect(deps.clearCachesAndReload).toHaveBeenCalledOnce();
  });

  it('does NOT reload when build times match and force is off', async () => {
    const deps = {
      ...baseDeps(),
      forceOnChunkFailure: false,
      fetchServerBuildTime: vi.fn(async () => 'CLIENT'),
    };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(false);
    expect(deps.clearCachesAndReload).not.toHaveBeenCalled();
  });

  it('DOES reload when build times match but forceOnChunkFailure is true (CDN/SWR hole)', async () => {
    const deps = {
      ...baseDeps(),
      forceOnChunkFailure: true,
      fetchServerBuildTime: vi.fn(async () => 'CLIENT'),
    };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(true);
    expect(deps.clearCachesAndReload).toHaveBeenCalledOnce();
    // Version fetch is skipped entirely in the force path.
    expect(deps.fetchServerBuildTime).not.toHaveBeenCalled();
  });

  it('defaults forceOnChunkFailure to true (chunk 2703 hot after #893/#935)', async () => {
    const deps = {
      ...baseDeps(),
      fetchServerBuildTime: vi.fn(async () => 'CLIENT'),
    };
    const did = await recoverFromStaleChunk(deps);
    expect(did).toBe(true);
    expect(deps.clearCachesAndReload).toHaveBeenCalledOnce();
  });

  it('does NOT reload when the version fetch fails and force is off', async () => {
    const deps = {
      ...baseDeps(),
      forceOnChunkFailure: false,
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

describe('hardNavigateCacheBust / stripChunkReloadParam', () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    const replace = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://lexiclash.live/en/daily?x=1',
        reload: vi.fn(),
        replace,
      },
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        state: null,
        replaceState: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    Object.defineProperty(window, 'history', { configurable: true, value: originalHistory });
  });

  it('navigates with a cache-busting query param instead of bare reload', () => {
    hardNavigateCacheBust(() => 12345);
    expect(window.location.replace).toHaveBeenCalledOnce();
    const dest = String((window.location.replace as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(dest).toContain(`${CHUNK_RELOAD_PARAM}=12345`);
    expect(dest).toContain('x=1');
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('strips the recovery param from the address bar after a clean boot', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: `https://lexiclash.live/en?${CHUNK_RELOAD_PARAM}=99&keep=1`,
        reload: vi.fn(),
        replace: vi.fn(),
      },
    });
    stripChunkReloadParam();
    expect(window.history.replaceState).toHaveBeenCalledOnce();
    const next = (window.history.replaceState as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(next).toBe('/en?keep=1');
    expect(String(next)).not.toContain(CHUNK_RELOAD_PARAM);
  });

  it('no-ops strip when the param is absent', () => {
    stripChunkReloadParam();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});

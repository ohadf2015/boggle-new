import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ChunkErrorRecovery from '../ChunkErrorRecovery';

// Cache-busting replace is the observable side effect — stub it so the test
// environment survives. Bare reload is the fallback only.
const replaceSpy = vi.fn();
const reloadSpy = vi.fn();

beforeEach(() => {
  replaceSpy.mockClear();
  reloadSpy.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    value: {
      href: 'https://lexiclash.live/en',
      reload: reloadSpy,
      replace: replaceSpy,
    },
    writable: true,
    configurable: true,
  });
  (process.env as Record<string, string>).NEXT_PUBLIC_BUILD_TIME = 'CLIENT_OLD';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockVersion(serverBuildTime: string, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      json: async () => ({ buildTime: serverBuildTime }),
    })),
  );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ChunkErrorRecovery', () => {
  it('hard-navigates on a chunk unhandledrejection (force path, no version gate)', async () => {
    mockVersion('SERVER_NEW');
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('Failed to fetch dynamically imported module: /_next/static/chunks/x.js');
    window.dispatchEvent(event);

    await flush();
    await flush();
    expect(replaceSpy).toHaveBeenCalledOnce();
    expect(String(replaceSpy.mock.calls[0][0])).toContain('_lc_chunk=');
  });

  it('still hard-navigates when the build appears current (CDN/SWR chunk 404 hole)', async () => {
    // Pre-#t_f6783906 this was a silent no-op — the version gate blocked recovery
    // when clientBuildTime === serverBuildTime even though the hashed chunk 404'd.
    mockVersion('CLIENT_OLD');
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('Loading chunk 5 failed.');
    window.dispatchEvent(event);

    await flush();
    await flush();
    expect(replaceSpy).toHaveBeenCalledOnce();
  });

  it('ignores non-chunk errors (no navigation)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new TypeError('Cannot read properties of undefined');
    window.dispatchEvent(event);

    await flush();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', async () => {
    mockVersion('SERVER_NEW');
    const { unmount } = render(<ChunkErrorRecovery />);
    unmount();

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('Loading chunk 9 failed.');
    window.dispatchEvent(event);

    await flush();
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

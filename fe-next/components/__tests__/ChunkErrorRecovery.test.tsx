import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ChunkErrorRecovery from '../ChunkErrorRecovery';

// Reload is the observable side effect — stub it so the test environment survives.
const reloadSpy = vi.fn();

beforeEach(() => {
  reloadSpy.mockClear();
  sessionStorage.clear();
  // jsdom/happy-dom: location.reload is read-only; redefine for the assertion.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: reloadSpy },
    writable: true,
    configurable: true,
  });
  // Stale build: client build time differs from the server's.
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
  it('hard-reloads on a chunk unhandledrejection when the build is stale', async () => {
    mockVersion('SERVER_NEW');
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('Failed to fetch dynamically imported module: /_next/static/chunks/x.js');
    window.dispatchEvent(event);

    await flush();
    await flush();
    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it('does NOT reload when the build is current (genuine error)', async () => {
    mockVersion('CLIENT_OLD'); // server matches client → not stale
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('Loading chunk 5 failed.');
    window.dispatchEvent(event);

    await flush();
    await flush();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('ignores non-chunk errors (no version fetch, no reload)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<ChunkErrorRecovery />);

    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new TypeError('Cannot read properties of undefined');
    window.dispatchEvent(event);

    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
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
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

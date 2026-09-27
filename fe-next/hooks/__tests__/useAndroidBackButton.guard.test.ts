/**
 * @jest-environment jsdom
 *
 * Gap-5 regression: on Capacitor Android the hardware back button never fires
 * popstate, so useAndroidBackButton handles it directly. Before the fix it did
 * double-tap-to-exit on root routes even mid-game — silently skipping the
 * "leave game?" confirm that web/iOS get via popstate. Now it consults the
 * navigation-guard registry and, when a guard is active, routes the press
 * through browser history so the guard's popstate handler fires.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAndroidBackButton } from '../useAndroidBackButton';
import {
  registerNavigationGuard,
  __resetNavigationGuardsForTest,
} from '../../lib/navigation/navigationGuardRegistry';

vi.mock('../../utils/platform', () => ({ isNative: () => true }));

const routerBack = vi.fn();
const routerPush = vi.fn();
let currentPath = '/en/singleplayer'; // a ROOT path (would double-tap-exit)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: routerBack, push: routerPush }),
  usePathname: () => currentPath,
}));

// Capture the backButton handler Capacitor registers.
let capturedHandler: ((d: { canGoBack: boolean }) => void) | null = null;
const exitApp = vi.fn().mockResolvedValue(undefined);

function installCapacitor() {
  (globalThis as unknown as { Capacitor?: unknown }).Capacitor = {
    isPluginAvailable: () => true,
    Plugins: {
      App: {
        addListener: (_event: string, cb: (d: { canGoBack: boolean }) => void) => {
          capturedHandler = cb;
          return Promise.resolve({ remove: () => {} });
        },
        exitApp,
      },
    },
  };
}

async function flush() {
  // Let the addListener promise resolve so capturedHandler is set.
  await Promise.resolve();
  await Promise.resolve();
}

describe('useAndroidBackButton :: navigation-guard consult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNavigationGuardsForTest();
    capturedHandler = null;
    installCapacitor();
    Object.defineProperty(window.history, 'length', { configurable: true, value: 3 });
  });
  afterEach(() => {
    delete (globalThis as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('routes back through history (NOT exitApp) when a guard is active on a root path', async () => {
    const unregister = registerNavigationGuard();
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    renderHook(() => useAndroidBackButton());
    await flush();
    expect(capturedHandler).toBeTypeOf('function');

    capturedHandler!({ canGoBack: true });

    expect(historyBack).toHaveBeenCalledTimes(1); // guard's popstate handler will fire
    expect(exitApp).not.toHaveBeenCalled();
    unregister();
    historyBack.mockRestore();
  });

  it('falls back to double-tap-to-exit hint when NO guard is active', async () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    renderHook(() => useAndroidBackButton());
    await flush();

    capturedHandler!({ canGoBack: true });

    // First press on a root path with no guard → exit-hint toast, not exit.
    expect(exitApp).not.toHaveBeenCalled();
    expect(
      dispatch.mock.calls.some(([e]) => (e as Event).type === 'lexiclash:exit-hint'),
    ).toBe(true);
    dispatch.mockRestore();
  });
});

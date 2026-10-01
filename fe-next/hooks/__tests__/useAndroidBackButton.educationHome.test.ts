/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAndroidBackButton } from '../useAndroidBackButton';
import { __resetNavigationGuardsForTest } from '../../lib/navigation/navigationGuardRegistry';

vi.mock('../../utils/platform', () => ({ isNative: () => true }));

const routerBack = vi.fn();
const routerPush = vi.fn();
let currentPath = '/en/teacher';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: routerBack, push: routerPush }),
  usePathname: () => currentPath,
}));

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
  await Promise.resolve();
  await Promise.resolve();
}

describe('useAndroidBackButton :: history-less back never leaves education for the consumer home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNavigationGuardsForTest();
    capturedHandler = null;
    installCapacitor();
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
  });

  afterEach(() => {
    delete (globalThis as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it.each(['/en/education', '/he/education/'])('%s with no history does not push the bare locale root', async (path) => {
    currentPath = path;
    const hint = vi.fn();
    window.addEventListener('lexiclash:exit-hint', hint);
    renderHook(() => useAndroidBackButton());
    await flush();
    capturedHandler!({ canGoBack: false });
    expect(routerPush).not.toHaveBeenCalled();
    expect(hint).toHaveBeenCalledTimes(1);
    window.removeEventListener('lexiclash:exit-hint', hint);
  });

  it('a second tap inside the window exits the app instead of opening the consumer home', async () => {
    currentPath = '/en/education';
    renderHook(() => useAndroidBackButton());
    await flush();
    capturedHandler!({ canGoBack: false });
    capturedHandler!({ canGoBack: false });
    expect(exitApp).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });
});

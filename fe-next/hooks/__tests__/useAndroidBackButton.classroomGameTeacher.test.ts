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
const currentPath = '/en/education/classroom-game';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: routerBack, push: routerPush }),
  usePathname: () => currentPath,
}));

let profile: { user_role?: string } | null = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile }),
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

function setHistoryLength(n: number) {
  Object.defineProperty(window.history, 'length', { configurable: true, value: n });
}

async function mountAndPress(canGoBack: boolean) {
  renderHook(() => useAndroidBackButton());
  await Promise.resolve();
  await Promise.resolve();
  capturedHandler!({ canGoBack });
}

describe('useAndroidBackButton :: classroom-game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNavigationGuardsForTest();
    capturedHandler = null;
    profile = null;
    installCapacitor();
  });

  afterEach(() => {
    delete (globalThis as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('sends a teacher to /teacher even when history could pop back onto /education', async () => {
    profile = { user_role: 'teacher' };
    setHistoryLength(3);
    await mountAndPress(true);
    expect(routerPush).toHaveBeenCalledWith('/en/teacher');
    expect(routerBack).not.toHaveBeenCalled();
  });

  it('sends a teacher to /teacher on a cold-start deep link (no history)', async () => {
    profile = { user_role: 'teacher' };
    setHistoryLength(1);
    await mountAndPress(false);
    expect(routerPush).toHaveBeenCalledWith('/en/teacher');
  });

  it('keeps history back for a guest-demo visitor', async () => {
    setHistoryLength(3);
    await mountAndPress(true);
    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('keeps the /education parent for a non-teacher with no history', async () => {
    profile = { user_role: 'student' };
    setHistoryLength(1);
    await mountAndPress(false);
    expect(routerPush).toHaveBeenCalledWith('/en/education');
  });
});

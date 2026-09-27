/**
 * @jest-environment jsdom
 *
 * QA gap (d) from the 2026-09-18 edu-fun-dumped-on-homepage gauntlet:
 * a teacher who cold-starts the Android app deep-linked straight into
 * /<locale>/teacher (no browser history — e.g. from a push notification or
 * an Android task-switcher relaunch) must land back in the education section
 * on back-press, never on the bare LexiClash homepage.
 *
 * useAndroidBackButton falls back to `router.push(parentRoute(pathname))`
 * when there's no history to pop. parentRoute has PARENT_OVERRIDES routing
 * top-level education routes (/teacher, /student, /join, /classroom) to
 * /{locale}/education instead of the default "drop one segment → home" rule.
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

describe('useAndroidBackButton :: education deep-link with no history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNavigationGuardsForTest();
    capturedHandler = null;
    installCapacitor();
    // No history to pop — simulates a cold-start deep link.
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
  });

  afterEach(() => {
    delete (globalThis as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('pushes /{locale}/education, not /{locale}, when landing directly on /{locale}/teacher', async () => {
    currentPath = '/en/teacher';
    renderHook(() => useAndroidBackButton());
    await flush();
    expect(capturedHandler).toBeTypeOf('function');

    capturedHandler!({ canGoBack: false });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/en/education');
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('pushes /{locale}/education for /{locale}/student and /{locale}/classroom too', async () => {
    for (const [path, expected] of [
      ['/he/student', '/he/education'],
      ['/sv/classroom', '/sv/education'],
    ] as const) {
      routerPush.mockClear();
      capturedHandler = null;
      currentPath = path;
      renderHook(() => useAndroidBackButton());
      await flush();
      capturedHandler!({ canGoBack: false });
      expect(routerPush).toHaveBeenCalledWith(expected);
    }
  });

  it('still pushes bare /{locale} for a non-education deep link (control case)', async () => {
    currentPath = '/en/words/apple';
    renderHook(() => useAndroidBackButton());
    await flush();
    capturedHandler!({ canGoBack: false });
    expect(routerPush).toHaveBeenCalledWith('/en/words');
  });
});

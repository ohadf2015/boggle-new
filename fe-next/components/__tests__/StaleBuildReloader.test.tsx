import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mutable pathname the next/navigation mock reads.
const nav = vi.hoisted(() => ({ pathname: '/en' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

const reloadMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/deploy/staleDeployReload', () => ({
  clearCachesAndReload: reloadMock,
}));

import { StaleBuildReloader } from '../StaleBuildReloader';
import NavigationContext from '@/contexts/NavigationContext';
import { STALE_BUILD_CHECK_INTERVAL_MS } from '@/lib/deploy/staleBuildAutoReload';

function NavWrapper({ isInGame, children }: { isInGame: boolean; children: ReactNode }) {
  return (
    <NavigationContext.Provider
      value={{ isInGame, setIsInGame: () => {}, activeTab: 'home', setActiveTab: () => {} }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

const CLIENT_COMMIT = 'commit-old';
const SERVER_COMMIT = 'commit-new';
const TAB_AGE_OVER_MIN = 31 * 60 * 1000; // > 30 min open

let hidden = false;

function setDocumentHidden(value: boolean) {
  hidden = value;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
}

function mockVersionFetch(commit: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ buildTime: 'bt-new', commit }),
    }),
  );
}

async function runOneCheck() {
  // One interval tick = one /api/version check (fires only while visible).
  await act(async () => {
    await vi.advanceTimersByTimeAsync(STALE_BUILD_CHECK_INTERVAL_MS);
  });
}

describe('StaleBuildReloader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    reloadMock.mockClear();
    nav.pathname = '/en';
    setDocumentHidden(false);
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = CLIENT_COMMIT;
    process.env.NEXT_PUBLIC_BUILD_TIME = 'bt-old';
    // Tab opened 31 minutes ago.
    Object.defineProperty(performance, 'timeOrigin', {
      configurable: true,
      value: Date.now() - TAB_AGE_OVER_MIN,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('same build → no reload', async () => {
    mockVersionFetch(CLIENT_COMMIT);
    render(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    await runOneCheck();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('new build + idle + visible + open > 30 min → exactly one reload', async () => {
    mockVersionFetch(SERVER_COMMIT);
    render(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    expect(reloadMock).toHaveBeenCalledTimes(1);
    // Further checks must not reload again (loop guard).
    await runOneCheck();
    await runOneCheck();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('new build + in-game → deferred until the round ends', async () => {
    mockVersionFetch(SERVER_COMMIT);
    const { rerender } = render(
      <NavWrapper isInGame={true}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    expect(reloadMock).not.toHaveBeenCalled();

    // Round ends → the pending reload fires.
    rerender(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await act(async () => {});
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('repeated mismatch → loop guard holds across remounts (max 1 reload / 30 min)', async () => {
    mockVersionFetch(SERVER_COMMIT);
    const first = render(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Reload attempt "happened" but the tab is somehow still alive on the old
    // bundle (navigation aborted, SW hiccup) and the hook remounts — the
    // sessionStorage guard must stop a reload loop.
    first.unmount();
    render(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    await runOneCheck();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('fresh tab (open < 30 min) is not reloaded even when stale', async () => {
    mockVersionFetch(SERVER_COMMIT);
    Object.defineProperty(performance, 'timeOrigin', {
      configurable: true,
      value: Date.now() - 5 * 60 * 1000, // 5 minutes old
    });
    render(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('never reloads while the tab is hidden; fires once visible again', async () => {
    mockVersionFetch(SERVER_COMMIT);
    const { rerender } = render(
      <NavWrapper isInGame={true}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await runOneCheck(); // mismatch found, deferred (in game)
    expect(reloadMock).not.toHaveBeenCalled();

    // Round ends BUT the tab is now hidden → still no reload.
    setDocumentHidden(true);
    rerender(
      <NavWrapper isInGame={false}>
        <StaleBuildReloader />
      </NavWrapper>,
    );
    await act(async () => {});
    expect(reloadMock).not.toHaveBeenCalled();

    // Tab becomes visible again → visibilitychange fires an off-cadence check,
    // the pending reload finally fires.
    setDocumentHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { VersionChecker } from '../VersionChecker';
import NavigationContext from '@/contexts/NavigationContext';

function NavWrapper({ isInGame, children }: { isInGame: boolean; children: ReactNode }) {
  const [active, setActive] = useState(isInGame);
  // Re-sync when test flips the prop
  if (active !== isInGame) setActive(isInGame);
  return (
    <NavigationContext.Provider
      value={{
        isInGame: active,
        setIsInGame: setActive,
        activeTab: 'home',
        setActiveTab: () => {},
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

describe('VersionChecker mid-game defer', () => {
  const originalBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const reloadSpy = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_BUILD_TIME = 'build-old';

    // jsdom location.reload is a no-op stub; replace with a spy
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    sessionStorage.clear();

    // Pretend server reports a NEW build time → triggers update flag
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ buildTime: 'build-new' }),
      }),
    );

    // Caches + serviceWorker shims (forceUpdate path)
    vi.stubGlobal('caches', { keys: async () => [], delete: async () => true });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: async () => [] },
    });

    reloadSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_BUILD_TIME = originalBuildTime;
  });

  it('defers reload while user is in-game', async () => {
    render(
      <NavWrapper isInGame={true}>
        <VersionChecker />
      </NavWrapper>,
    );

    // Run initial 10s check + flush microtasks for the fetch chain
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    // 1.5s "auto-update" delay window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reloads once user exits the game', async () => {
    const { rerender } = render(
      <NavWrapper isInGame={true}>
        <VersionChecker />
      </NavWrapper>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    // User leaves the game → context flips false
    rerender(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads immediately when update detected outside any game', async () => {
    render(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});

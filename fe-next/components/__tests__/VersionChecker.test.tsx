import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent } from '@testing-library/react';
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

const REFRESH_BTN = { name: /refreshToUpdate/i };

describe('VersionChecker manual refresh', () => {
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

  // Advance past the initial 10s poll + flush the fetch microtask chain so the
  // new-version flag is set.
  async function detectUpdate() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
  }

  it('never auto-reloads when a new version is detected outside a game', async () => {
    render(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );

    await detectUpdate();
    // Plenty of idle time — the old code reloaded after 1.5s; new code must not.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('shows a refresh button when an update is detected and not in-game', async () => {
    render(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );

    await detectUpdate();

    expect(screen.getByRole('button', REFRESH_BTN)).toBeTruthy();
  });

  it('reloads ONLY when the user clicks the refresh button', async () => {
    render(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );

    await detectUpdate();
    expect(reloadSpy).not.toHaveBeenCalled();

    const btn = screen.getByRole('button', REFRESH_BTN);
    await act(async () => {
      fireEvent.click(btn);
      // forceUpdate awaits caches/serviceWorker before reload — flush microtasks
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('hides the refresh button while in-game and never reloads', async () => {
    render(
      <NavWrapper isInGame={true}>
        <VersionChecker />
      </NavWrapper>,
    );

    await detectUpdate();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.queryByRole('button', REFRESH_BTN)).toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reveals the button after the user leaves the game (still no auto-reload)', async () => {
    const { rerender } = render(
      <NavWrapper isInGame={true}>
        <VersionChecker />
      </NavWrapper>,
    );

    await detectUpdate();
    expect(screen.queryByRole('button', REFRESH_BTN)).toBeNull();

    // User leaves the game → context flips false
    rerender(
      <NavWrapper isInGame={false}>
        <VersionChecker />
      </NavWrapper>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(screen.queryByRole('button', REFRESH_BTN)).not.toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

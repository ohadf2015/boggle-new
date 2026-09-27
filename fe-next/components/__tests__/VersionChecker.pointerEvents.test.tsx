/**
 * The "New version available" toast docks in a `fixed inset-x-0` container —
 * a FULL-VIEWPORT-WIDTH box. The container itself is hit-testable, so once an
 * update was detected it swallowed every click in that horizontal band on every
 * page, not just the clicks that landed on the visible purple card.
 *
 * Measured on the Quick Play results screen: probing the "Spin next round"
 * button at 2%/15%/35%/50%/75%/98% of its width returned the toast's container
 * at EVERY point — the primary CTA was 100% unclickable, so finishing one round
 * left the player stuck with no way to start another.
 *
 * A positioning wrapper must not intercept pointer input; only the card does.
 *
 * Written BEFORE implementation (RED phase).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { VersionChecker } from '../VersionChecker';
import NavigationContext from '@/contexts/NavigationContext';

function NavWrapper({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <NavigationContext.Provider
      value={{ isInGame: active, setIsInGame: setActive, activeTab: 'home', setActiveTab: () => {} }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

describe('VersionChecker — the toast must not swallow clicks meant for the page', () => {
  const originalBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_BUILD_TIME = 'build-old';
    sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildTime: 'build-new' }) })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_BUILD_TIME = originalBuildTime;
  });

  async function detectUpdate() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
  }

  it('makes the full-width positioning container transparent to pointer events', async () => {
    const { container } = render(
      <NavWrapper>
        <VersionChecker />
      </NavWrapper>
    );
    await detectUpdate();

    const dock = container.querySelector('[role="status"]') as HTMLElement;
    expect(dock).toBeTruthy();
    // It spans the viewport, so it MUST NOT be hit-testable itself.
    expect(dock.className).toMatch(/\binset-x-0\b/);
    expect(dock.className).toMatch(/\bpointer-events-none\b/);
  });

  it('keeps the card itself interactive so Refresh still works', async () => {
    const { container } = render(
      <NavWrapper>
        <VersionChecker />
      </NavWrapper>
    );
    await detectUpdate();

    const dock = container.querySelector('[role="status"]') as HTMLElement;
    const card = dock.firstElementChild as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.className).toMatch(/\bpointer-events-auto\b/);
    // The refresh button is still reachable inside the card.
    expect(screen.getByRole('button', { name: /refreshToUpdate/i })).toBeTruthy();
  });
});

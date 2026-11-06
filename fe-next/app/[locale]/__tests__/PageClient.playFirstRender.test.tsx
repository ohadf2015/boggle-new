/**
 * Regression: the PLAY → onboarding handler must exist on the FIRST client
 * render. A previous `mounted &&` gate left it undefined until one effect cycle
 * after hydration; users who clicked PLAY inside that window silently fell
 * through to /multiplayer navigation instead of opening OnboardingFlow — the
 * 83% PLAY→onboarding funnel leak. PLAY is a real <a href> either way, so the
 * first render stays byte-identical with the handler attached.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

const propLog: Array<(() => void) | undefined> = [];

vi.mock('@/components/landing', () => ({
  LandingView: ({ onStartOnboarding }: { onStartOnboarding?: () => void }) => {
    propLog.push(onStartOnboarding);
    return <div data-testid="landing-view" />;
  },
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="onboarding-flow" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackInviteLanded: vi.fn(),
  trackInviteRedirectFired: vi.fn(),
}));

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { search, pathname: '/en', origin: 'http://localhost' },
    writable: true,
  });
}

describe('HomePageClient: PLAY handler on first render', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    propLog.length = 0;
    setSearch('');
  });

  it('passes onStartOnboarding on the first client render, before any effect cycle', () => {
    render(<HomePageClient />);
    expect(propLog.length).toBeGreaterThan(0);
    expect(propLog[0]).toBeTypeOf('function');
  });
});

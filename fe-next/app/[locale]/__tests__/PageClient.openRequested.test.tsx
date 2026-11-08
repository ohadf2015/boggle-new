/**
 * Telemetry for the landing PLAY→onboarding leak (16% conversion despite the
 * mounted-gate fix): a PLAY click that reaches PageClient.handleStartOnboarding
 * must fire `onboarding_open_requested` with allowed:true BEFORE OnboardingFlow
 * mounts (its chunk is lazy-loaded). With the existing events it splits the
 * leak three ways:
 *   cta_clicked − open_requested ≈ 0 by construction — both fire on every
 *     PLAY click decision (the link components fire allowed:false twins for
 *     clicks that resolve to native nav), so this gap is pure tracking loss;
 *   open_requested(allowed:true) − onboarding_started = handler ran but the
 *     flow never mounted (lazy-chunk load failure / render crash);
 *   open_requested(allowed:false, fallthrough:'native_nav'|'modified_click')
 *     = clicks accounted WITHOUT an open request (returning users by design);
 *   started − skipped/completed = the flow opened, then the user bailed.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';
import { trackOnboardingOpenRequested } from '@/utils/growthTracking';

vi.mock('@/components/landing', () => ({
  LandingView: ({ onStartOnboarding }: { onStartOnboarding?: () => void }) => (
    <button data-testid="play" onClick={onStartOnboarding}>PLAY</button>
  ),
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
  trackOnboardingOpenRequested: vi.fn(),
}));

const mockTrackOpenRequested = vi.mocked(trackOnboardingOpenRequested);

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { search, pathname: '/en', origin: 'http://localhost' },
    writable: true,
  });
}

describe('HomePageClient: onboarding_open_requested telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setSearch('');
    mockTrackOpenRequested.mockClear();
  });

  it('PLAY click fires onboarding_open_requested and mounts OnboardingFlow', () => {
    render(<HomePageClient />);
    act(() => screen.getByTestId('play').click());

    expect(mockTrackOpenRequested).toHaveBeenCalledTimes(1);
    expect(mockTrackOpenRequested).toHaveBeenCalledWith({ allowed: true });
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
  });

  it('returning users get no handler — PageClient passes undefined, so the click fires nothing at this level', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);

    act(() => screen.getByTestId('play').click());

    expect(mockTrackOpenRequested).not.toHaveBeenCalled();
    expect(screen.queryByTestId('onboarding-flow')).toBeNull();
  });
});

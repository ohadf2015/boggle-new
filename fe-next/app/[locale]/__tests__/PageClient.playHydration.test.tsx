/**
 * PageClient — PLAY is wired from the first client render (hydration-gap fix).
 *
 * PostHog 7d: 185 of 213 landing_cta_clicked (87%) never reached
 * onboarding_started. Cause: PageClient gated onStartOnboarding behind a
 * `mounted` effect, so PLAY clicks handled before that effect ran got no
 * onPlay and the underlying <a href> navigated away instead of opening
 * OnboardingFlow. The prop only upgrades the click — it never changes markup
 * (freshPlayBridge doc) — so wiring it synchronously for new users is
 * hydration-safe (no React #418). Clicks that still land pre-mount now fire
 * landing_play_hydration_gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

const landingRenders: Array<{ onStartOnboarding?: () => void }> = [];
vi.mock('@/components/landing', () => ({
  LandingView: (props: { onStartOnboarding?: () => void }) => {
    landingRenders.push(props);
    return <div data-testid="landing-view" />;
  },
}));

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="onboarding-flow" /> }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => track(...a),
  trackInviteLanded: vi.fn(),
  trackInviteRedirectFired: vi.fn(),
}));

describe('HomePageClient — PLAY wired synchronously (hydration-gap fix)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    landingRenders.length = 0;
    track.mockClear();
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('passes onStartOnboarding on the FIRST client render, before any effect runs', () => {
    render(<HomePageClient />);
    // Pre-fix, renders[0] carried undefined here (mounted gate) — exactly the
    // window where an early PLAY click leaked to plain navigation.
    expect(landingRenders.length).toBeGreaterThan(0);
    expect(landingRenders[0].onStartOnboarding).toBeDefined();
  });

  it('the first-render PLAY handler opens OnboardingFlow without waiting for a re-render', () => {
    const { getByTestId } = render(<HomePageClient />);
    const firstRenderHandler = landingRenders[0].onStartOnboarding;
    expect(firstRenderHandler).toBeDefined();
    act(() => firstRenderHandler?.());
    expect(getByTestId('onboarding-flow')).toBeTruthy();
    // LandingView stays mounted beneath the FTUE overlay (CLS invariant).
    expect(getByTestId('landing-view')).toBeTruthy();
  });

  it('still omits the PLAY handler for returning users', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(landingRenders[0].onStartOnboarding).toBeUndefined();
  });

  it('does not fire landing_play_hydration_gap for a normal post-mount PLAY click', () => {
    render(<HomePageClient />);
    act(() => landingRenders[0].onStartOnboarding?.());
    expect(track.mock.calls.some((c) => c[0] === 'landing_play_hydration_gap')).toBe(false);
  });
});

/**
 * PageClient — first-time visitors drop straight into OnboardingFlow.
 *
 * New users get the short FTUE (language → name/avatar → style) immediately on
 * first visit, rendered as an opaque full-screen overlay ON TOP of the marketing
 * LandingView (reverses the 2026-05-08 landing-first experiment; overlay-not-
 * replace since 2026-07-29 — unmounting LandingView was the CLS 1.0 regression).
 * Returning users still see LandingView alone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

// Mock LandingView to expose the onStartOnboarding callback
vi.mock('@/components/landing', () => ({
  LandingView: ({ onStartOnboarding }: { onStartOnboarding?: () => void }) => (
    <div data-testid="landing-view">
      {onStartOnboarding && (
        <button onClick={onStartOnboarding} data-testid="play-cta">
          Start Playing
        </button>
      )}
    </div>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: (_fn: unknown, _opts: unknown) =>
    () => <div data-testid="onboarding-flow" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('HomePageClient — auto-onboarding for new users', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  // INTENT CHANGE (homepage gauntlet SPEC §8, lead override 2026-09-23): a plain
  // fresh visitor is no longer auto-dropped into the FTUE overlay (it trapped
  // them: scroll p50 0%). They land on the fresh page and PLAY opens the FTUE.
  // The overlay-not-replace invariant below is unchanged.
  it('opens OnboardingFlow as an overlay ON TOP of LandingView when a new user presses PLAY', () => {
    render(<HomePageClient />);
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('play-cta'));
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    // LandingView STAYS mounted underneath the opaque FTUE overlay — unmounting
    // it post-hydration reflowed the SEO section and was the CLS 1.0 source.
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('renders LandingView for returning users (onboarding completed)', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });

  it('does not pass onStartOnboarding for returning users', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    expect(screen.queryByTestId('play-cta')).not.toBeInTheDocument();
  });

  it('renders LandingView (NOT OnboardingFlow) for a JS-rendering crawler (SEO)', () => {
    // Googlebot's WRS runs this effect with empty localStorage — without the
    // isCrawler() guard it would flip to the FTUE and index the onboarding
    // interstitial instead of the marketing content. This is the regression
    // guard for "bots can reach the requested page".
    const originalUA = window.navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      configurable: true,
    });
    try {
      render(<HomePageClient />);
      expect(screen.getByTestId('landing-view')).toBeInTheDocument();
      expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: originalUA,
        configurable: true,
      });
    }
  });
});

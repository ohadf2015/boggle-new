/**
 * PageClient — first-time visitors drop straight into OnboardingFlow.
 *
 * New users get the short FTUE (language → name/avatar → style) immediately on
 * first visit, NOT the marketing LandingView (reverses the 2026-05-08
 * landing-first experiment). Returning users still see LandingView.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('renders OnboardingFlow (not LandingView) for new users on first visit', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
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
});

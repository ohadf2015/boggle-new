/**
 * PageClient — new users land on LandingView, not OnboardingFlow
 *
 * Previously, new users were immediately redirected to OnboardingFlow
 * on mount. The fix: render LandingView first and pass onStartOnboarding
 * so users choose when to begin onboarding.
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

describe('HomePageClient — landing-first for new users', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('renders LandingView (not OnboardingFlow) for new users on initial load', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });

  it('passes onStartOnboarding to LandingView for new users', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('play-cta')).toBeInTheDocument();
  });

  it('shows OnboardingFlow after clicking play CTA', () => {
    render(<HomePageClient />);
    fireEvent.click(screen.getByTestId('play-cta'));
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
  });

  it('does not pass onStartOnboarding for returning users (onboarding completed)', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    // No CTA for returning users — they already onboarded
    expect(screen.queryByTestId('play-cta')).not.toBeInTheDocument();
  });
});

/**
 * PageClient — auto-mount FTUE for CrazyGames users on homepage.
 *
 * Pre-fix CG users had to click the "Start Playing" CTA on LandingView before
 * the CG short-flow (tutorial→welcome) showed. PostHog data 2026-05: only 2/20
 * CG users in 90d ever saw cg_welcome_view, suggesting most ignored the CTA.
 * CG portal traffic = high intent to play immediately, not browse marketing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

vi.mock('@/components/landing', () => ({
  LandingView: ({ onStartOnboarding }: { onStartOnboarding?: () => void }) => (
    <div data-testid="landing-view">
      {onStartOnboarding && (
        <button onClick={onStartOnboarding} data-testid="play-cta">Start</button>
      )}
    </div>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="onboarding-flow" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

let mockCgDetected = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  detectCrazyGamesSync: () => mockCgDetected,
}));

describe('HomePageClient — CG auto-onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockCgDetected = false;
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('overlays OnboardingFlow on LandingView on first paint when CG iframe detected', () => {
    mockCgDetected = true;
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    // LandingView stays mounted beneath the opaque FTUE overlay (CLS fix).
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('mounts OnboardingFlow for non-CG new users too (first-visit auto-onboard)', () => {
    mockCgDetected = false;
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('does NOT auto-mount FTUE for CG users who already completed onboarding', () => {
    mockCgDetected = true;
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    // Returning CG users auto-start the daily puzzle instead of landing/FTUE.
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });
});

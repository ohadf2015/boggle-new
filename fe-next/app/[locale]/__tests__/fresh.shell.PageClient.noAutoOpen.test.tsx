/**
 * Homepage gauntlet SPEC §8 (lead override): a plain fresh web visitor is no
 * longer trapped in an auto-opened OnboardingFlow overlay (scroll p50 was 0%).
 * They land on the scrollable fresh page; PLAY opens OnboardingFlow.
 * High-intent arrivals still auto-open: ?room= invites, ?next= bounces and
 * CrazyGames portal traffic (see the invite/nextParam/cgAutoOnboard tests).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

vi.mock('@/components/landing', () => ({
  LandingView: ({ onStartOnboarding }: { onStartOnboarding?: () => void }) => (
    <div data-testid="landing-view">
      {onStartOnboarding && (
        <button onClick={onStartOnboarding} data-testid="play-cta">Play</button>
      )}
    </div>
  ),
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

describe('HomePageClient — fresh visitors land on the page, not the overlay', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    track.mockClear();
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('does not auto-open OnboardingFlow for a plain fresh visitor', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });

  it('PLAY opens OnboardingFlow on top of the page', () => {
    render(<HomePageClient />);
    fireEvent.click(screen.getByTestId('play-cta'));
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('still fires landing_view for the fresh visitor', () => {
    render(<HomePageClient />);
    expect(track).toHaveBeenCalledWith('landing_view', { is_new_user: true });
  });
});

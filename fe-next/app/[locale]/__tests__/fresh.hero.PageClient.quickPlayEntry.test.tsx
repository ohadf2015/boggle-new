/**
 * Piece B (hero): the fresh page's PLAY opens OnboardingFlow straight into quick
 * play (entry="quickPlay"). High-intent auto-opens (?next= bounce, ?room=
 * invite, CrazyGames) keep the full flow (no entry). When the quick-play flow
 * completes it navigates away; the homepage must not flash back underneath
 * while the game route loads, so a cover stays up.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

let completeFlow: (() => void) | null = null;
vi.mock('next/dynamic', () => ({
  default: () =>
    function FlowStub({ entry, onComplete }: { entry?: string; onComplete: () => void }) {
      completeFlow = onComplete;
      return <div data-testid="onboarding-flow" data-entry={entry ?? ''} />;
    },
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

describe('HomePageClient: hero PLAY enters quick play', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    completeFlow = null;
    setSearch('');
  });

  it('PLAY opens OnboardingFlow with entry="quickPlay"', () => {
    render(<HomePageClient />);
    fireEvent.click(screen.getByTestId('play-cta'));
    expect(screen.getByTestId('onboarding-flow')).toHaveAttribute('data-entry', 'quickPlay');
  });

  it('a ?next= bounce auto-opens the FULL flow (no quick-play entry)', () => {
    setSearch('?next=/en/practice');
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toHaveAttribute('data-entry', '');
  });

  it('after quick play completes, a cover stays up instead of the homepage flashing back', () => {
    render(<HomePageClient />);
    fireEvent.click(screen.getByTestId('play-cta'));
    act(() => completeFlow?.());
    expect(screen.queryByTestId('onboarding-flow')).toBeNull();
    expect(screen.getByTestId('home-quickplay-cover')).toBeInTheDocument();
  });

  it('the cover survives a slow game-route load, and clears on a bfcache restore', () => {
    vi.useFakeTimers();
    try {
      render(<HomePageClient />);
      fireEvent.click(screen.getByTestId('play-cta'));
      act(() => completeFlow?.());
      act(() => {
        vi.advanceTimersByTime(12000);
      });
      expect(screen.getByTestId('home-quickplay-cover')).toBeInTheDocument();
      act(() => {
        const e = new Event('pageshow') as Event & { persisted?: boolean };
        Object.defineProperty(e, 'persisted', { value: true });
        window.dispatchEvent(e);
      });
      expect(screen.queryByTestId('home-quickplay-cover')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

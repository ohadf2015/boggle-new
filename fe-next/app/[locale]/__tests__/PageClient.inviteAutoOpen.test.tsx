/**
 * HomePageClient — new-user room-invite auto-opens FTUE.
 *
 * Regression: commit 69d360bb6 ("landing-first UX", 2026-05-08) parked new
 * users on LandingView; 1d1cb7d53 restored auto-FTUE for `?next=` but NOT for
 * room invites. Result: invited first-time players landed on the marketing page
 * with no name/avatar prompt and never reached the room (PostHog: 114 invitees,
 * 0 invite_tutorial_started for 3 weeks). A pending room invite must drop the
 * new user straight into OnboardingFlow (which runs the invite-aware flow), the
 * same way `?next=` does.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/components/landing', () => ({
  LandingView: () => <div data-testid="landing-view" />,
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = ({ onComplete }: { onComplete: () => void }) => (
      <div data-testid="onboarding-flow">
        <button data-testid="onboarding-complete" onClick={onComplete}>done</button>
      </div>
    );
    return Stub;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  detectCrazyGamesSync: () => false,
}));

// Avoid PostHog network calls. PageClient also fires trackGrowthEvent
// ('landing_view') from a mount effect, so the mock must expose it too —
// otherwise the mounted component throws "No trackGrowthEvent export".
vi.mock('@/utils/growthTracking', () => ({
  trackInviteLanded: vi.fn(),
  trackInviteRedirectFired: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

describe('HomePageClient new-user room invite', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { search: '?room=ABC123&host=Alice', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('auto-opens FTUE for a new user who arrives via a room invite link', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
  });

  it('persists the pending invite so OnboardingFlow can consume it', () => {
    render(<HomePageClient />);
    expect(sessionStorage.getItem('lexiclash_pending_room_invite')).toContain('ABC123');
  });

  it('does NOT auto-open FTUE for a returning user (they redirect to /multiplayer)', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('/multiplayer?room=ABC123'));
  });
});

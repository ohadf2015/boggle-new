import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Guest who finished onboarding but hasn't seen the style popup → shouldShowStylePopup → true.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: null,
    needsProfileCustomization: false,
    updateProfile: vi.fn(),
    loading: false,
  }),
}));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/lib/playerStyle/playerStyleStorage', () => ({
  hasPlayerStyleModalBeenShown: () => false,
  markPlayerStyleModalShown: vi.fn(),
}));
// The modal is dynamically imported — stub it so we just detect render.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = () => <div data-testid="style-popup" />;
    Stub.displayName = 'PlayerStyleModalStub';
    return Stub;
  },
}));

let pathname = '/en/practice';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import PlayerStyleOnboardingWrapper from '../PlayerStyleOnboardingWrapper';

describe('PlayerStyleOnboardingWrapper route gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function renderAndSettle() {
    render(<PlayerStyleOnboardingWrapper />);
    // Mount effect + the 800ms settle timer that decides `show`.
    act(() => {
      vi.advanceTimersByTime(900);
    });
  }

  it('does NOT render the style popup on the marketing landing route', () => {
    pathname = '/en';
    renderAndSettle();
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });

  it('renders the style popup on an in-app route (eligible guest)', () => {
    pathname = '/en/practice';
    renderAndSettle();
    expect(screen.getByTestId('style-popup')).toBeInTheDocument();
  });
});

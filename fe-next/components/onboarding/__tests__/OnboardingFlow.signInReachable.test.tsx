/**
 * The FTUE takeover must carry a sign-in control that needs no scrolling.
 *
 * Live bug (1440x900, /en, first visit): OnboardingFlow renders
 * `fixed inset-0 z-[100]`, so the site header — the only Sign In on the page —
 * is covered. `document.elementFromPoint` on the header's Sign In button
 * resolved to `[data-testid="onboarding-flow"]`, not the button.
 *
 * A sign-in path did exist inside the takeover, but it was a small underlined
 * link in the tertiary row at the very bottom of the step: measured at y=705 in
 * a 633px-tall viewport, i.e. below the fold on the one screen the FTUE
 * promises. A returning teacher on a fresh device saw no way in.
 *
 * Fix: the takeover shell owns ONE sign-in control, pinned to the top inline-end
 * corner — where the header's Sign In would be if the takeover were not covering
 * it. It is present on every step of the takeover, so a returning user can leave
 * the guest flow from wherever they land.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false }),
}));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({ updateSetting: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingStart: vi.fn(),
  trackOnboardingStep: vi.fn(),
  trackOnboardingCompleted: vi.fn(),
  trackOnboardingSkipped: vi.fn(),
  trackOnboardingQuickPlay: vi.fn(),
  trackInviteTutorialSkipped: vi.fn(),
  trackInviteConsumed: vi.fn(),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestStats: () => ({ games: 0 }) }));
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
  consumePendingRoomInvite: vi.fn(),
  hasPendingRoomInvite: () => false,
  getPendingRoomInvite: () => null,
}));
vi.mock('@/utils/profileStorage', () => ({ setStoredCustomAvatar: vi.fn() }));

vi.mock('../QuickStartStep', () => ({
  __esModule: true,
  default: () => <div data-testid="quick-start-step" />,
}));
vi.mock('@/components/HowToPlay', () => ({
  __esModule: true,
  default: () => <div data-testid="how-to-play" />,
}));
vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="auth-modal" /> : null,
}));

import OnboardingFlow from '../OnboardingFlow';

describe('OnboardingFlow — sign-in survives the header takeover', () => {
  it('pins one sign-in control in the takeover shell, outside the step content', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    const signIn = screen.getByTestId('onboarding-sign-in');
    expect(signIn).toBeInTheDocument();

    // Pinned to the shell, not nested in the (scrollable) step content.
    const step = screen.getByTestId('quick-start-step');
    expect(step.contains(signIn)).toBe(false);
    expect(signIn.className).toContain('absolute');
  });

  it('opens the auth modal when the pinned control is used', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('onboarding-sign-in'));

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('exposes exactly one sign-in affordance in the takeover', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.getAllByTestId(/sign-in|have-account/)).toHaveLength(1);
  });
});

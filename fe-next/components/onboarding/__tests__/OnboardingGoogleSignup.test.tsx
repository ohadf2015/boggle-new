/**
 * OnboardingGoogleSignup — optional, delightful "Sign up with Google" panel
 * shown at the FTUE profile step. Eagerly persists the crafted name + avatar
 * (so whichever Google path fires carries them), and renders the GSI in-page
 * button on web / a redirect-fallback button on native.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, d?: string) => d ?? k, dir: 'ltr', language: 'en' }),
}));

const savePendingOnboardingProfile = vi.fn();
vi.mock('@/utils/onboardingStorage', () => ({
  savePendingOnboardingProfile: (...args: unknown[]) => savePendingOnboardingProfile(...args),
}));

const setStoredCustomAvatar = vi.fn();
vi.mock('@/utils/profileStorage', () => ({
  setStoredCustomAvatar: (...args: unknown[]) => setStoredCustomAvatar(...args),
}));

vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: () => <div data-testid="gsi-button" />,
}));

const signIn = vi.fn();
vi.mock('@/components/auth/hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: () => ({ signIn, loadingProvider: null, error: null, clearError: vi.fn(), nativeOAuthAvailable: false }),
  default: () => ({ signIn, loadingProvider: null }),
}));

const isNative = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({ isNative: () => isNative() }));

import OnboardingGoogleSignup from '@/components/onboarding/OnboardingGoogleSignup';

const avatar = { face: 'f1' } as never;

describe('OnboardingGoogleSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNative.mockReturnValue(false);
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-client-id';
  });

  it('renders the panel with a headline', () => {
    render(<OnboardingGoogleSignup name="Zelda" avatar={avatar} nameValid nameEdited />);
    expect(screen.getByTestId('onboarding-google-signup')).toBeInTheDocument();
  });

  it('persists the trimmed name + avatar when the name is valid', () => {
    render(<OnboardingGoogleSignup name="  Zelda  " avatar={avatar} nameValid nameEdited />);
    expect(savePendingOnboardingProfile).toHaveBeenCalledWith({
      displayName: 'Zelda',
      avatarId: 'custom',
      nameEdited: true,
    });
    expect(setStoredCustomAvatar).toHaveBeenCalledWith(avatar);
  });

  it('does NOT persist while the name is invalid', () => {
    render(<OnboardingGoogleSignup name="z" avatar={avatar} nameValid={false} nameEdited={false} />);
    expect(savePendingOnboardingProfile).not.toHaveBeenCalled();
    expect(setStoredCustomAvatar).not.toHaveBeenCalled();
  });

  it('uses the GSI in-page button on web with a Google client id', () => {
    render(<OnboardingGoogleSignup name="Zelda" avatar={avatar} nameValid nameEdited />);
    expect(screen.getByTestId('gsi-button')).toBeInTheDocument();
  });

  it('falls back to a redirect button that triggers Google sign-in on native', () => {
    isNative.mockReturnValue(true);
    render(<OnboardingGoogleSignup name="Zelda" avatar={avatar} nameValid nameEdited />);
    expect(screen.queryByTestId('gsi-button')).not.toBeInTheDocument();

    const btn = screen.getByTestId('onboarding-google-fallback');
    fireEvent.click(btn);
    expect(signIn).toHaveBeenCalledWith('google');
  });
});

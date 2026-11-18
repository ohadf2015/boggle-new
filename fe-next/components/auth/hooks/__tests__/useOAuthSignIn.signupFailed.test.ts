/**
 * A throw in the OAuth click path must emit growth:signup_failed.
 * Chunk-load failures used to die as an unhandled "x is not a function"
 * and never showed up in the funnel.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const trackSignupFailed = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackSignupPromptClicked: vi.fn(),
  trackSignupFailed: (...args: unknown[]) => trackSignupFailed(...args),
}));

const signInWithGoogle = vi.fn();
vi.mock('@/lib/auth/loadAuthClient', () => ({
  loadAuthClient: () => Promise.resolve({ signInWithGoogle }),
  AuthClientLoadError: class AuthClientLoadError extends Error {
    constructor(cause: unknown) {
      super('Could not load the sign-in client');
      this.cause = cause;
      this.name = 'AuthClientLoadError';
    }
    cause: unknown;
  },
}));

vi.mock('@/utils/platform', () => ({ isNative: () => false }));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock('@/components/auth/shared/authModalProviders', () => ({
  isMicrosoftSsoEnabled: () => false,
}));

import { useOAuthSignIn } from '../useOAuthSignIn';

describe('useOAuthSignIn emits signup_failed on a throw', () => {
  beforeEach(() => {
    trackSignupFailed.mockClear();
    signInWithGoogle.mockReset();
  });

  it('emits signup_failed with the error message when signInWithGoogle throws', async () => {
    signInWithGoogle.mockRejectedValue(new TypeError('a.cd is not a function'));
    const { result } = renderHook(() => useOAuthSignIn({ analyticsSource: 'multi_games_sheet' }));
    await act(async () => {
      await result.current.signIn('google');
    });
    expect(trackSignupFailed).toHaveBeenCalledWith('oauth_redirect_error', {
      source: 'multi_games_sheet',
      message: 'a.cd is not a function',
    });
  });
});

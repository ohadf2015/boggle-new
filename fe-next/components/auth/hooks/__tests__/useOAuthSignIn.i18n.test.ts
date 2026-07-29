/**
 * useOAuthSignIn — i18n tap-test
 *
 * Audit memory `feedback-hardcoded-leaderboard-error.md` flagged hardcoded
 * English error strings as a project-rule violation. This test pins the
 * web-Apple path: signing in with Apple on the web (no native SDK) must
 * surface the canonical translation key, not raw English.
 *
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({
  signInWithGoogle: vi.fn(),
  signInWithDiscord: vi.fn(),
}));

vi.mock('@/utils/platform', () => ({
  isNative: () => false, // Force web flow
}));

vi.mock('@/utils/mobileOAuth', () => ({
  performMobileOAuth: vi.fn(),
}));

vi.mock('@/utils/nativeOAuth', () => ({
  performNativeOAuth: vi.fn(),
  initializeNativeOAuth: vi.fn().mockResolvedValue(false),
  isNativeOAuthAvailable: () => false,
}));

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import { useOAuthSignIn } from '../useOAuthSignIn';

describe('useOAuthSignIn — i18n', () => {
  it('Apple on web → error is the canonical i18n key (not raw English)', async () => {
    const { result } = renderHook(() => useOAuthSignIn());

    await act(async () => {
      await result.current.signIn('apple');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('errors.appleSignInIosOnly');
    });
  });
});

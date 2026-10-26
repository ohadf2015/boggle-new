/** @vitest-environment jsdom */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const isNativeMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/lib/supabase', () => ({
  signInWithGoogle: vi.fn(),
  signInWithDiscord: vi.fn(),
  signInWithMicrosoft: vi.fn(async () => ({ error: null })),
}));
vi.mock('@/utils/platform', () => ({ isNative: isNativeMock }));
vi.mock('@/utils/mobileOAuth', () => ({ performMobileOAuth: vi.fn() }));
vi.mock('@/utils/nativeOAuth', () => ({
  performNativeOAuth: vi.fn(),
  initializeNativeOAuth: vi.fn().mockResolvedValue(false),
  isNativeOAuthAvailable: () => false,
}));
vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), debug: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import { useOAuthSignIn } from '../useOAuthSignIn';
import { signInWithMicrosoft } from '@/lib/supabase';
import { performMobileOAuth } from '@/utils/mobileOAuth';

describe('useOAuthSignIn — Microsoft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeMock.mockReturnValue(false);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('starts the Microsoft redirect on web when the flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    const { result } = renderHook(() => useOAuthSignIn());
    await act(async () => {
      await result.current.signIn('microsoft');
    });
    expect(signInWithMicrosoft).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('refuses with a translated error while the flag is off', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useOAuthSignIn({ onError }));
    await act(async () => {
      await result.current.signIn('microsoft');
    });
    expect(signInWithMicrosoft).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('errors.microsoftSignInUnavailable');
  });

  it('refuses inside the native app, where the in-app browser flow has no Microsoft path', async () => {
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    isNativeMock.mockReturnValue(true);
    const { result } = renderHook(() => useOAuthSignIn());
    await act(async () => {
      await result.current.signIn('microsoft');
    });
    expect(signInWithMicrosoft).not.toHaveBeenCalled();
    expect(performMobileOAuth).not.toHaveBeenCalled();
    expect(result.current.error).toBe('errors.microsoftSignInUnavailable');
  });
});

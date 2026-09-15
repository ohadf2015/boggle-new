/**
 * t_da22db9a — useOAuthSignIn analyticsSource.
 *
 * Every OAuth tap from a signup prompt must emit `signup_prompt_clicked`
 * BEFORE any early-return path (native platform, Apple-on-web error return,
 * user cancel) so the mid-funnel step is never silently dropped.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockTrackSignupPromptClicked = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackSignupPromptClicked: (...args: unknown[]) => mockTrackSignupPromptClicked(...args),
}));

const mockSignInWithGoogle = vi.fn();
const mockSignInWithDiscord = vi.fn();
vi.mock('@/lib/supabase', () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  signInWithDiscord: (...args: unknown[]) => mockSignInWithDiscord(...args),
}));

vi.mock('@/utils/platform', () => ({
  isNative: () => false,
}));

vi.mock('@/utils/mobileOAuth', () => ({
  performMobileOAuth: vi.fn(),
}));

vi.mock('@/utils/nativeOAuth', () => ({
  performNativeOAuth: vi.fn(),
  initializeNativeOAuth: vi.fn(),
  isNativeOAuthAvailable: () => false,
}));

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import { useOAuthSignIn } from '../useOAuthSignIn';

describe('useOAuthSignIn — analyticsSource (t_da22db9a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue({ data: { url: 'https://accounts.google.com/oauth' }, error: null });
    mockSignInWithDiscord.mockResolvedValue({ data: { url: 'https://discord.com/oauth' }, error: null });
  });

  it('emits signup_prompt_clicked with the source when an analyticsSource is set', async () => {
    const { result } = renderHook(() => useOAuthSignIn({ analyticsSource: 'mp_sheet' }));

    await act(async () => {
      await result.current.signIn('google');
    });

    expect(mockTrackSignupPromptClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupPromptClicked).toHaveBeenCalledWith('mp_sheet');
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit when no analyticsSource is set (header/menu sign-ins stay unattributed)', async () => {
    const { result } = renderHook(() => useOAuthSignIn());

    await act(async () => {
      await result.current.signIn('google');
    });

    expect(mockTrackSignupPromptClicked).not.toHaveBeenCalled();
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('emits BEFORE the Apple-on-web early return (unsupported-provider error path)', async () => {
    const { result } = renderHook(() => useOAuthSignIn({ analyticsSource: 'first_win_sheet' }));

    await act(async () => {
      await result.current.signIn('apple');
    });

    // Click tracked even though Apple-on-web bails out with an error.
    expect(mockTrackSignupPromptClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupPromptClicked).toHaveBeenCalledWith('first_win_sheet');
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    expect(mockSignInWithDiscord).not.toHaveBeenCalled();
  });
});

/**
 * Real Edge UA, not a mocked isEdgeBrowser(). Opening the button must not
 * emit signup_failed. The fallback click still starts redirect OAuth.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const EDGE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

const { signInWithGoogle, loadAuthClient, trackSignupFailed } = vi.hoisted(() => ({
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  loadAuthClient: vi.fn(),
  trackSignupFailed: vi.fn(),
}));

vi.mock('@/lib/auth/loadAuthClient', () => ({
  loadAuthClient,
  isAuthClientConfigured: () => true,
  AuthClientLoadError: class AuthClientLoadError extends Error {},
  AUTH_CLIENT_LOAD_FAILED_EVENT: 'lc:auth-client-load-failed',
}));
vi.mock('@/utils/growthTracking', () => ({
  trackSignupPromptClicked: vi.fn(),
  latchSignupSource: vi.fn(),
  trackSignupFailed: (...args: unknown[]) => trackSignupFailed(...args),
}));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/lib/auth/googleOneTap', () => ({
  ensureGoogleIdInitialized: vi.fn().mockResolvedValue(undefined),
}));

import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton with a real Edge user agent', () => {
  const original = navigator.userAgent;

  beforeEach(() => {
    vi.useFakeTimers();
    trackSignupFailed.mockClear();
    signInWithGoogle.mockClear();
    loadAuthClient.mockReset().mockResolvedValue({ signInWithGoogle });
    Object.defineProperty(navigator, 'userAgent', { value: EDGE_UA, configurable: true });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid.apps.googleusercontent.com');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true });
  });

  it('sends no signup_failed, and the fallback still starts Google redirect', async () => {
    render(<GoogleSignInButton analyticsSource="edu_access" />);
    expect(screen.getByTestId('google-signin-edge-fallback')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000);
    });
    expect(trackSignupFailed).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('google-signin-edge-fallback'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});

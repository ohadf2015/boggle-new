/**
 * Edge never mounts the GSI iframe (third-party cookies). The redirect fallback
 * is the working path. The render loop must not call that a signup failure —
 * it was a false gsi_render_timeout on every Edge open since #2029.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const edge = vi.hoisted(() => ({ value: true }));
vi.mock('@/utils/platform', () => ({
  isNative: () => false,
  isEdgeBrowser: () => edge.value,
}));

const { signInWithGoogle, loadAuthClient } = vi.hoisted(() => ({
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  loadAuthClient: vi.fn(),
}));
vi.mock('@/lib/auth/loadAuthClient', () => ({
  loadAuthClient,
  isAuthClientConfigured: () => true,
  AuthClientLoadError: class AuthClientLoadError extends Error {},
  AUTH_CLIENT_LOAD_FAILED_EVENT: 'lc:auth-client-load-failed',
}));

const trackSignupFailed = vi.fn();
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

describe('GoogleSignInButton Edge fallback does not fake a GSI timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    edge.value = true;
    trackSignupFailed.mockClear();
    signInWithGoogle.mockClear();
    loadAuthClient.mockReset().mockResolvedValue({ signInWithGoogle });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid.apps.googleusercontent.com');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('opening the button on Edge emits no signup_failed, including gsi_render_timeout', async () => {
    render(<GoogleSignInButton analyticsSource="edu_access" />);
    expect(screen.getByTestId('google-signin-edge-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('gsi-button-container')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000);
    });

    expect(trackSignupFailed).not.toHaveBeenCalled();
  });

  it('clicking the Edge fallback still starts the redirect OAuth path', async () => {
    render(<GoogleSignInButton analyticsSource="edu_access" />);
    fireEvent.click(screen.getByTestId('google-signin-edge-fallback'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});

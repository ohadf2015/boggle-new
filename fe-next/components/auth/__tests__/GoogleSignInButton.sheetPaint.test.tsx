/**
 * Prod 2026-11-17: the post-game sheet showed "Continue with Google" but GSI
 * never painted an iframe. The container was a 0px flex item (placeholder stole
 * the row) and renderButton ran once before the preloader's script arrived, so
 * the tap hit an inert placeholder. Email still worked; Google signups went to 0.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/utils/platform', () => ({ isNative: () => false, isEdgeBrowser: () => false }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/lib/auth/googleOneTap', () => ({
  ensureGoogleIdInitialized: vi.fn().mockResolvedValue(undefined),
}));

const signInWithGoogle = vi.fn().mockResolvedValue({ error: null });
const { loadAuthClient, AuthClientLoadError } = vi.hoisted(() => ({
  loadAuthClient: vi.fn(),
  AuthClientLoadError: class AuthClientLoadError extends Error {},
}));
vi.mock('@/lib/auth/loadAuthClient', () => ({
  loadAuthClient,
  isAuthClientConfigured: () => true,
  AuthClientLoadError,
  AUTH_CLIENT_LOAD_FAILED_EVENT: 'lc:auth-client-load-failed',
}));

const neoErrorToast = vi.fn();
vi.mock('@/components/NeoToast', () => ({
  neoErrorToast: (...args: unknown[]) => neoErrorToast(...args),
}));

const trackSignupFailed = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackSignupPromptClicked: vi.fn(),
  latchSignupSource: vi.fn(),
  trackSignupFailed: (...args: unknown[]) => trackSignupFailed(...args),
}));

import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton sheet paint (t_de3e790a)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid.apps.googleusercontent.com');
    signInWithGoogle.mockReset().mockResolvedValue({ error: null });
    loadAuthClient.mockReset().mockResolvedValue({ signInWithGoogle });
    trackSignupFailed.mockClear();
    neoErrorToast.mockClear();
    delete (window as unknown as { google?: unknown }).google;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
  });

  it('gives the GSI container a non-shrinking width so a flex row cannot collapse it to 0', () => {
    render(<GoogleSignInButton />);
    const container = screen.getByTestId('gsi-button-container');
    expect(container.className).toMatch(/w-full/);
    expect(container.className).toMatch(/shrink-0/);
  });

  it('retries renderButton when GSI arrives after the first paint (preloader won the script race)', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    render(<GoogleSignInButton />);
    expect(screen.getByTestId('gsi-placeholder')).toBeInTheDocument();
    const renderButton = vi.fn();
    (window as unknown as { google: unknown }).google = { accounts: { id: { renderButton } } };
    await waitFor(() => expect(renderButton).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('a tap before the iframe exists starts the redirect OAuth path instead of dying on the placeholder', async () => {
    render(<GoogleSignInButton analyticsSource="multi_games_sheet" />);
    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('a pointerdown alone, as when a scroll starts on the button, does not open Google', async () => {
    render(<GoogleSignInButton analyticsSource="multi_games_sheet" />);
    fireEvent.pointerDown(screen.getByTestId('gsi-frame'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loadAuthClient).not.toHaveBeenCalled();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it('a second tap while the redirect is starting does not start another', async () => {
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByTestId('gsi-frame'));
    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows the error toast and allows a retry when sign-in returns an error', async () => {
    signInWithGoogle.mockResolvedValueOnce({ error: { message: 'nope' } });
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(neoErrorToast).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(2));
  });

  it('shows the error toast and allows a retry when sign-in throws', async () => {
    signInWithGoogle.mockRejectedValueOnce(new Error('boom'));
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(neoErrorToast).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(2));
  });

  it('shows one toast when the auth client fails to load', async () => {
    loadAuthClient.mockRejectedValueOnce(new AuthClientLoadError('chunk'));
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(trackSignupFailed).toHaveBeenCalled());
    expect(neoErrorToast).toHaveBeenCalledTimes(1);
  });
});

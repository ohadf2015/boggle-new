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
vi.mock('@/lib/auth/loadAuthClient', () => ({
  loadAuthClient: () => Promise.resolve({ signInWithGoogle }),
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

import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton sheet paint (t_de3e790a)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid.apps.googleusercontent.com');
    signInWithGoogle.mockClear();
    trackSignupFailed.mockClear();
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
    fireEvent.pointerDown(screen.getByTestId('gsi-frame'));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
  });
});

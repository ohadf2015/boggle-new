import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent, screen } from '@testing-library/react';

vi.mock('@/utils/platform', () => ({ isNative: () => false, isEdgeBrowser: () => false }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {} }, signInWithGoogle: vi.fn() }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/lib/auth/googleOneTap', () => ({ ensureGoogleIdInitialized: vi.fn().mockResolvedValue(undefined) }));
const trackSignupPromptClicked = vi.fn();
const latchSignupSource = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackSignupPromptClicked: (s: string) => trackSignupPromptClicked(s),
  latchSignupSource: (s: string) => latchSignupSource(s),
}));

import GoogleSignInButton from '../GoogleSignInButton';

function stub() {
  const renderButton = vi.fn();
  (window as unknown as { google: unknown }).google = { accounts: { id: { renderButton } } };
  return renderButton;
}

describe('GoogleSignInButton click_listener (t_147a0f0c)', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid.apps.googleusercontent.com'));
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
    vi.clearAllMocks();
  });

  it('passes click_listener that tracks + latches the analytics source', async () => {
    const renderButton = stub();
    render(<GoogleSignInButton analyticsSource="results_inline" />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    const opts = renderButton.mock.calls[0][1] as { click_listener?: () => void };
    expect(typeof opts.click_listener).toBe('function');
    opts.click_listener!();
    expect(trackSignupPromptClicked).toHaveBeenCalledWith('results_inline');
    expect(latchSignupSource).toHaveBeenCalledWith('results_inline');
  });

  it('dedupes a frame pointerdown followed by the GSI click_listener', async () => {
    const renderButton = stub();
    render(<GoogleSignInButton analyticsSource="results_inline" />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    fireEvent.pointerDown(screen.getByTestId('gsi-frame'));
    (renderButton.mock.calls[0][1] as { click_listener: () => void }).click_listener();
    expect(trackSignupPromptClicked).toHaveBeenCalledTimes(1);
  });

  it('is a no-op without analyticsSource', async () => {
    const renderButton = stub();
    render(<GoogleSignInButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    (renderButton.mock.calls[0][1] as { click_listener: () => void }).click_listener();
    expect(trackSignupPromptClicked).not.toHaveBeenCalled();
    expect(latchSignupSource).not.toHaveBeenCalled();
  });
});

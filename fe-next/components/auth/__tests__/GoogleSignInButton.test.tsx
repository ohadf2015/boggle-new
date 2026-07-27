import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockIsNative = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({
  isNative: () => mockIsNative(),
  isEdgeBrowser: () => false,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: vi.fn() } },
}));

vi.mock('next/script', () => ({
  default: (props: { src?: string }) => <div data-testid="gsi-script" data-src={props.src} />,
}));

vi.mock('@/lib/auth/googleOneTap', () => ({
  ensureGoogleIdInitialized: vi.fn().mockResolvedValue(undefined),
}));

import GoogleSignInButton from '../GoogleSignInButton';

/** Install a spyable window.google so the render effect actually calls renderButton. */
function stubGoogleId() {
  const renderButton = vi.fn();
  (window as unknown as { google: unknown }).google = {
    accounts: { id: { renderButton } },
  };
  return renderButton;
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(false);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
    vi.clearAllMocks();
  });

  it('renders a button container + the GIS script on web when configured', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByTestId('gsi-button-container')).toBeTruthy();
    expect(screen.getByTestId('gsi-script').getAttribute('data-src')).toBe(
      'https://accounts.google.com/gsi/client',
    );
  });

  it('wraps the visible Google button in a neo-brutalist frame', () => {
    render(<GoogleSignInButton />);
    const frame = screen.getByTestId('gsi-frame');
    expect(frame.className).toMatch(/border-neo-black/);
    expect(frame.className).toMatch(/shadow-hard/);
  });

  it('matches the Discord button chrome so the two providers read as a matched pair', () => {
    render(<GoogleSignInButton />);
    const frame = screen.getByTestId('gsi-frame');
    // Discord (Button base) = border-3, rounded-xl, 48px tall. The frame must
    // match or Google reads as the weaker/smaller sibling.
    expect(frame.className).toMatch(/border-3/);
    expect(frame.className).toMatch(/rounded-xl/);
    expect(frame.className).toMatch(/min-h-\[48px\]/);
    expect(frame.className).toMatch(/items-center/);
  });

  it('renders a full-width white frame so the snug button reads as full-width like the other providers', () => {
    render(<GoogleSignInButton />);
    const frame = screen.getByTestId('gsi-frame');
    // Full-width + white bg: the auto-sized (snug) GSI button is centered inside,
    // and the white frame bg blends with the white button → one full-width control.
    expect(frame.className).toMatch(/w-full/);
    expect(frame.className).toMatch(/justify-center/);
    expect(frame.className).toMatch(/bg-white/);
  });

  it('renders the Google button auto-sized (no forced width) so its content stays centered', async () => {
    const renderButton = stubGoogleId();
    render(<GoogleSignInButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    const opts = renderButton.mock.calls[0][1] as Record<string, unknown>;
    // A forced width wider than the content makes GSL float the logo+text off-center
    // (drifts to the "end" in RTL). Omitting width lets GSI size to content.
    expect(opts.width).toBeUndefined();
    expect(opts.logo_alignment).toBe('center');
  });

  it('passes the site language as renderButton locale so the button matches the page, not the browser', async () => {
    const renderButton = stubGoogleId();
    render(<GoogleSignInButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    const opts = renderButton.mock.calls[0][1] as Record<string, unknown>;
    // Default context language is 'en' (no LanguageProvider in this test).
    expect(opts.locale).toBe('en');
  });

  it('still honors an explicit width prop when a caller forces one', async () => {
    const renderButton = stubGoogleId();
    render(<GoogleSignInButton width={260} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    const opts = renderButton.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.width).toBe(260);
  });

  it('renders nothing on the native platform (native uses the SDK)', () => {
    mockIsNative.mockReturnValue(true);
    render(<GoogleSignInButton />);
    expect(screen.queryByTestId('gsi-button-container')).toBeNull();
  });

  it('renders nothing when the Google client id is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
    render(<GoogleSignInButton />);
    expect(screen.queryByTestId('gsi-button-container')).toBeNull();
  });
});

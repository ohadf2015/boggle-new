import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockIsNative = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({
  isNative: () => mockIsNative(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: vi.fn() } },
}));

// Render next/script as a plain tag so we can assert it mounts.
vi.mock('next/script', () => ({
  // data-src (not src) so the @next/next/no-sync-scripts lint rule doesn't fire on the mock
  default: (props: { src?: string }) => <div data-testid="gsi-script" data-src={props.src} />,
}));

import GoogleOneTapInitializer from '../GoogleOneTapInitializer';

describe('GoogleOneTapInitializer', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the Google Identity Services script for an unauthenticated web user', () => {
    render(<GoogleOneTapInitializer />);
    const script = screen.getByTestId('gsi-script');
    expect(script.getAttribute('data-src')).toContain('https://accounts.google.com/gsi/client');
  });

  // Same root cause as the Sign-In button: GSI's displayed language is set by
  // the `hl` query param on the script URL at load time, not by anything set
  // later — without it the One Tap prompt falls back to the browser/OS locale.
  it('loads the GIS script with hl=<site language> so One Tap matches the page, not the OS/browser', () => {
    render(<GoogleOneTapInitializer />);
    const script = screen.getByTestId('gsi-script');
    expect(script.getAttribute('data-src')).toBe('https://accounts.google.com/gsi/client?hl=en');
  });

  it('renders nothing when the user is already authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    render(<GoogleOneTapInitializer />);
    expect(screen.queryByTestId('gsi-script')).toBeNull();
  });

  it('renders nothing on the native platform', () => {
    mockIsNative.mockReturnValue(true);
    render(<GoogleOneTapInitializer />);
    expect(screen.queryByTestId('gsi-script')).toBeNull();
  });

  it('renders nothing when the Google client id is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
    render(<GoogleOneTapInitializer />);
    expect(screen.queryByTestId('gsi-script')).toBeNull();
  });

  it('loads GIS even while cookie consent is still undecided', () => {
    // Regression: #1046 held GIS back until useConsentDecided() was true, but that
    // flag only flips on an explicit Accept/Decline CLICK. Visitors who ignored the
    // bar never saw One Tap and signups went 6-21/day -> 0 the next day. The cookie
    // bar is a compact bottom strip now and no longer overlaps One Tap (top-right).
    //
    // useConsentDecided is deliberately NOT mocked here: with no decision in
    // storage the real hook returns false, so re-adding a consent gate to this
    // component fails this test instead of silently passing a stubbed `true`.
    localStorage.clear();
    render(<GoogleOneTapInitializer />);
    expect(screen.queryByTestId('gsi-script')).not.toBeNull();
  });

  it('cancels a live One Tap when the growth signup prompt becomes active (t_da22db9a)', () => {
    const cancel = vi.fn();
    (window as unknown as { google: { accounts: { id: { cancel: typeof cancel } } } }).google = {
      accounts: { id: { cancel } },
    };
    render(<GoogleOneTapInitializer />);
    window.dispatchEvent(
      new CustomEvent('lexiclash:signup-prompt-active', { detail: { active: true } }),
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    delete (window as unknown as { google?: unknown }).google;
  });
});

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
    expect(script.getAttribute('data-src')).toBe('https://accounts.google.com/gsi/client');
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
});

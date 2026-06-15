import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockIsNative = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({
  isNative: () => mockIsNative(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: vi.fn() } },
}));

vi.mock('next/script', () => ({
  default: (props: { src?: string }) => <div data-testid="gsi-script" data-src={props.src} />,
}));

import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(false);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => vi.unstubAllEnvs());

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

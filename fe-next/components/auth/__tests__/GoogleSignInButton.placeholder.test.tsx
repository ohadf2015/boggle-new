import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/utils/platform', () => ({ isNative: () => false, isEdgeBrowser: () => false }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithIdToken: vi.fn() } } }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/lib/auth/googleOneTap', () => ({
  ensureGoogleIdInitialized: vi.fn().mockResolvedValue(undefined),
}));

import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton placeholder (no layout jump while GSI loads)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
  });

  it('given GSI has not loaded, then a matching inert placeholder is shown', () => {
    render(<GoogleSignInButton />);
    const ph = screen.getByTestId('gsi-placeholder');
    expect(ph).toHaveAttribute('aria-hidden', 'true');
    expect(ph.className).toContain('pointer-events-none');
  });

  it('given GSI rendered its button, then the placeholder is removed so it never obscures the iframe', async () => {
    (window as unknown as { google: unknown }).google = {
      accounts: { id: { renderButton: vi.fn() } },
    };
    render(<GoogleSignInButton />);
    await waitFor(() => expect(screen.queryByTestId('gsi-placeholder')).toBeNull());
  });
});

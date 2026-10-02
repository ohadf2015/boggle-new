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

import { ensureGoogleIdInitialized } from '@/lib/auth/googleOneTap';
import GoogleSignInButton from '../GoogleSignInButton';

/** Install a spyable window.google so the render effect actually calls renderButton. */
function stubGoogleId() {
  const renderButton = vi.fn();
  (window as unknown as { google: unknown }).google = {
    accounts: { id: { renderButton } },
  };
  return renderButton;
}

describe('GoogleSignInButton fills its frame (one box, not a box inside a box)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete (window as unknown as { google?: unknown }).google;
  });

  it('given a 342px frame, then Google renders a 342px centered button', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'gsi-frame' ? 342 : 0;
    });
    const renderButton = stubGoogleId();
    render(<GoogleSignInButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    const opts = renderButton.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.width).toBe(342);
    expect(opts.logo_alignment).toBe('center');
  });

  it('given a frame wider than Google allows, then it caps at 400', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'gsi-frame' ? 720 : 0;
    });
    const renderButton = stubGoogleId();
    render(<GoogleSignInButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect((renderButton.mock.calls[0][1] as Record<string, unknown>).width).toBe(400);
  });
});

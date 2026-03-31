/**
 * PostHogProvider Tests
 *
 * Verifies consent gating, opt-in/out, and rendering.
 */

import React from 'react';
import { render, act } from '@testing-library/react';

// Shared mock refs
const mocks = {
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
  has_opted_out_capturing: jest.fn().mockReturnValue(true),
};

jest.mock('posthog-js', () => ({ __esModule: true, default: mocks }));
jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockHasConsentValue = false;
const mockOnConsentChange = jest.fn().mockReturnValue(() => {});
jest.mock('@/utils/cookieConsent', () => ({
  hasConsent: () => mockHasConsentValue,
  onConsentChange: (...args: unknown[]) => mockOnConsentChange(...args),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/en/play',
  useSearchParams: () => new URLSearchParams(),
}));

// We need to reset the module-level `posthogInitialized` flag.
// Since jest.mock persists across resetModules, we can re-require safely.
function loadFreshProvider() {
  let PostHogProvider: React.FC<{ children: React.ReactNode }>;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PostHogProvider = require('../PostHogProvider').PostHogProvider;
  });
  return PostHogProvider!;
}

describe('PostHogProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasConsentValue = false;
    mocks.has_opted_out_capturing.mockReturnValue(true);
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  it('initializes PostHog with opt_out_capturing_by_default', () => {
    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mocks.init).toHaveBeenCalledWith('test-key', expect.objectContaining({
      api_host: 'https://us.i.posthog.com',
      opt_out_capturing_by_default: true,
      capture_pageview: false,
      capture_pageleave: true,
    }));
  });

  it('opts in when analytics consent is already granted', () => {
    mockHasConsentValue = true;
    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mocks.opt_in_capturing).toHaveBeenCalled();
  });

  it('stays opted out when analytics consent is denied', () => {
    mockHasConsentValue = false;
    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mocks.opt_in_capturing).not.toHaveBeenCalled();
  });

  it('subscribes to consent changes', () => {
    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mockOnConsentChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('opts in when consent changes to granted', () => {
    let consentCb: ((s: { analytics: boolean }) => void) | null = null;
    mockOnConsentChange.mockImplementation((cb: (s: { analytics: boolean }) => void) => {
      consentCb = cb;
      return () => {};
    });

    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    act(() => { consentCb?.({ analytics: true }); });
    expect(mocks.opt_in_capturing).toHaveBeenCalled();
  });

  it('opts out when consent is revoked', () => {
    let consentCb: ((s: { analytics: boolean }) => void) | null = null;
    mockOnConsentChange.mockImplementation((cb: (s: { analytics: boolean }) => void) => {
      consentCb = cb;
      return () => {};
    });

    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    act(() => { consentCb?.({ analytics: false }); });
    expect(mocks.opt_out_capturing).toHaveBeenCalled();
  });

  it('does not initialize when NEXT_PUBLIC_POSTHOG_KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const PostHogProvider = loadFreshProvider();
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mocks.init).not.toHaveBeenCalled();
  });

  it('renders children', () => {
    const PostHogProvider = loadFreshProvider();
    const { getByText } = render(
      <PostHogProvider><div>test child</div></PostHogProvider>
    );
    expect(getByText('test child')).toBeInTheDocument();
  });
});

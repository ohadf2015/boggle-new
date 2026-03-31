/**
 * PostHogProvider Tests
 *
 * Verifies consent gating, opt-in/out, and rendering.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import posthog from 'posthog-js';

// Must use jest.mocked after mock
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    has_opted_out_capturing: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockOnConsentChangeCallbacks: Array<(s: { analytics: boolean }) => void> = [];
let mockHasConsentValue = false;

jest.mock('@/utils/cookieConsent', () => ({
  hasConsent: () => mockHasConsentValue,
  onConsentChange: (cb: (s: { analytics: boolean }) => void) => {
    mockOnConsentChangeCallbacks.push(cb);
    return () => {
      const idx = mockOnConsentChangeCallbacks.indexOf(cb);
      if (idx >= 0) mockOnConsentChangeCallbacks.splice(idx, 1);
    };
  },
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/en/play',
  useSearchParams: () => new URLSearchParams(),
}));

import { PostHogProvider, _resetPostHogInit } from '../PostHogProvider';

const ph = posthog as jest.Mocked<typeof posthog>;

describe('PostHogProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasConsentValue = false;
    mockOnConsentChangeCallbacks.length = 0;
    ph.has_opted_out_capturing.mockReturnValue(true);
    _resetPostHogInit();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  it('initializes PostHog with opt_out_capturing_by_default', () => {
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(ph.init).toHaveBeenCalledWith('test-key', expect.objectContaining({
      api_host: 'https://us.i.posthog.com',
      opt_out_capturing_by_default: true,
      capture_pageview: false,
      capture_pageleave: true,
    }));
  });

  it('opts in when analytics consent is already granted', () => {
    mockHasConsentValue = true;
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(ph.opt_in_capturing).toHaveBeenCalled();
  });

  it('stays opted out when analytics consent is denied', () => {
    mockHasConsentValue = false;
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(ph.opt_in_capturing).not.toHaveBeenCalled();
  });

  it('subscribes to consent changes', () => {
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(mockOnConsentChangeCallbacks).toHaveLength(1);
  });

  it('opts in when consent changes to granted', () => {
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    act(() => {
      mockOnConsentChangeCallbacks[0]?.({ analytics: true });
    });

    expect(ph.opt_in_capturing).toHaveBeenCalled();
  });

  it('opts out when consent is revoked', () => {
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    act(() => {
      mockOnConsentChangeCallbacks[0]?.({ analytics: false });
    });

    expect(ph.opt_out_capturing).toHaveBeenCalled();
  });

  it('does not initialize when NEXT_PUBLIC_POSTHOG_KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(ph.init).not.toHaveBeenCalled();
  });

  it('renders children', () => {
    const { getByText } = render(
      <PostHogProvider><div>test child</div></PostHogProvider>
    );
    expect(getByText('test child')).toBeInTheDocument();
  });
});

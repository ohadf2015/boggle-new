/**
 * PostHogProvider Tests
 *
 * Verifies consent gating, opt-in/out, and rendering.
 */

import { render, act } from '@testing-library/react';
// PostHogProvider now talks to the lazy proxy (@/lib/analytics/lazyPosthog),
// whose own load/buffer mechanics are covered by lazyPosthog.test.ts. Here we
// mock the proxy seam so the provider's consent/init logic asserts synchronously
// — the proxy forwards init/opt_in/opt_out to these spies.
import posthog from '@/lib/analytics/lazyPosthog';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn().mockReturnValue(true),
    onFeatureFlags: vi.fn(),
  },
}));

const mockOnConsentChangeCallbacks: Array<(s: { analytics: boolean }) => void> = [];
let mockHasConsentValue = false;

vi.mock('@/utils/cookieConsent', () => ({
  hasConsent: () => mockHasConsentValue,
  onConsentChange: (cb: (s: { analytics: boolean }) => void) => {
    mockOnConsentChangeCallbacks.push(cb);
    return () => {
      const idx = mockOnConsentChangeCallbacks.indexOf(cb);
      if (idx >= 0) mockOnConsentChangeCallbacks.splice(idx, 1);
    };
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/play',
  useSearchParams: () => new URLSearchParams(),
}));

import { PostHogProvider, _resetPostHogInit } from '../PostHogProvider';

const ph = posthog as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('PostHogProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('initializes PostHog with consent-gated capturing (opt-out by default)', () => {
    render(<PostHogProvider><div>child</div></PostHogProvider>);

    expect(ph.init).toHaveBeenCalledWith('test-key', expect.objectContaining({
      api_host: 'https://us.i.posthog.com',
      opt_out_capturing_by_default: true,
      capture_pageview: false,
      capture_pageleave: true,
    }));
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

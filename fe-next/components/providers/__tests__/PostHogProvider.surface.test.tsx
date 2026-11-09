import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import posthog from '@/lib/analytics/lazyPosthog';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn().mockReturnValue(true),
    onFeatureFlags: vi.fn(),
  },
}));
vi.mock('@/utils/cookieConsent', () => ({ hasConsent: () => false, onConsentChange: () => () => {} }));

let mockPath = '/en/daily';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => new URLSearchParams(),
}));

import { PostHogProvider, _resetPostHogInit } from '../PostHogProvider';

const ph = posthog as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('PostHog surface super-property', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPostHogInit();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
  });

  it.each([
    ['/he/student/quick-play', 'edu'],
    ['/en/teacher', 'edu'],
    ['/en/education', 'edu'],
    ['/en/daily', 'game'],
    ['/en', 'game'],
  ])('tags the %s pageview as %s', (p, surface) => {
    mockPath = p;
    render(<PostHogProvider><div /></PostHogProvider>);
    expect(ph.register).toHaveBeenCalledWith({ surface });
  });

  it('switches the label when the visitor moves between products', () => {
    mockPath = '/en/daily';
    const { rerender } = render(<PostHogProvider><div /></PostHogProvider>);
    mockPath = '/en/student';
    rerender(<PostHogProvider><div /></PostHogProvider>);
    const lastSurface = ph.register.mock.calls.findLastIndex((c) => 'surface' in (c[0] as object));
    const pageview = ph.capture.mock.calls.findLastIndex((c) => c[0] === '$pageview');
    expect(ph.register.mock.calls[lastSurface][0]).toEqual({ surface: 'edu' });
    expect(pageview).toBeGreaterThanOrEqual(0);
    expect(ph.register.mock.invocationCallOrder[lastSurface]).toBeLessThan(ph.capture.mock.invocationCallOrder[pageview]);
  });
});

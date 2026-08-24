import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    isAuthenticated: true,
    profile: null,
  }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...a: unknown[]) => mockToastError(...a), success: vi.fn() },
}));

// The CTA is gated on a BUILD-time inlined flag, so it must be 'true' before the
// component module is imported — setting it inside a test is too late.
process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = 'true';

// Assigned per-test, NOT at module scope: this project's vitest setup file installs its own
// globalThis.fetch AFTER test modules are imported, so a module-level `global.fetch = …` is
// silently overwritten and the component calls the setup's fetch instead of this mock.
const mockFetch = vi.fn();

import * as growthTracking from '@/utils/growthTracking';
import UpgradePricingPageClient from '../PageClient';

const mockTrackGrowthEvent = growthTracking.trackGrowthEvent as ReturnType<typeof vi.fn>;

describe('UpgradePricingPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any lingering conversion-surface class
    document.body.classList.remove('conversion-surface');
    vi.stubGlobal('fetch', mockFetch);
  });

  it('tracks iap_viewed with product teacher_pro on mount', () => {
    render(<UpgradePricingPageClient />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { product: 'teacher_pro' });
  });

  it('district CTA links to for-schools lead form, not mailto', () => {
    render(<UpgradePricingPageClient />);
    const cta = screen.getByRole('link', { name: /teacher\.subscription\.districtCta/i });
    expect(cta).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('marks body as conversion-surface to suppress interstitial modals', () => {
    expect(document.body.classList.contains('conversion-surface')).toBe(false);
    const { unmount } = render(<UpgradePricingPageClient />);
    // While component is mounted, conversion-surface should be present
    expect(document.body.classList.contains('conversion-surface')).toBe(true);
    // After unmount, conversion-surface should be removed
    unmount();
    expect(document.body.classList.contains('conversion-surface')).toBe(false);
  });

  // A guest click returns 401 and retrying can never succeed, so the generic
  // "checkoutError" ("please try again") is a lie. Measured on prod 2026-08-23.
  // These two assert the 401 branch actually diverges — revert it and both fail.
  it('a 401 from checkout asks the visitor to sign in, never "try again"', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    render(<UpgradePricingPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith('/api/subscription/checkout', { method: 'POST' });
    await vi.waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('teacher.subscription.signInRequired'),
    );
    expect(mockToastError).not.toHaveBeenCalledWith('teacher.subscription.checkoutError');
  });

  it('a non-401 failure still gets the generic checkout error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<UpgradePricingPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
    await vi.waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('teacher.subscription.checkoutError'),
    );
    expect(mockToastError).not.toHaveBeenCalledWith('teacher.subscription.signInRequired');
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

global.fetch = vi.fn();

import * as growthTracking from '@/utils/growthTracking';
import UpgradePricingPageClient from '../PageClient';

const mockTrackGrowthEvent = growthTracking.trackGrowthEvent as ReturnType<typeof vi.fn>;

describe('UpgradePricingPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any lingering conversion-surface class
    document.body.classList.remove('conversion-surface');
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
});

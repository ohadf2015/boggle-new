import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
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
  });

  it('tracks iap_viewed with product teacher_pro on mount', () => {
    render(<UpgradePricingPageClient />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { product: 'teacher_pro' });
  });
});

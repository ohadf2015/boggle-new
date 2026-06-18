import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DistrictUpsellBanner } from '../DistrictUpsellBanner';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => mockTrackGrowthEvent(...a),
}));

const t = (key: string) => key;

describe('DistrictUpsellBanner', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('renders upsell text', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    expect(screen.getByText('teacher.districtBanner.text')).toBeInTheDocument();
  });

  it('renders CTA link to for-schools page', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/education/for-schools');
    expect(link).toHaveTextContent('teacher.districtBanner.cta');
  });

  it('uses locale in link href', () => {
    render(<DistrictUpsellBanner t={t} language="he" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/he/education/for-schools');
  });

  it('tracks impression on mount', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      { cta: 'teacher_district_banner' },
    );
  });

  it('tracks CTA click', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'landing_cta_clicked',
      { cta: 'teacher_district_banner', source: 'teacher_dashboard' },
    );
  });

  it('retains data attribute for postcapture fallback', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-ph-capture-attribute-source', 'teacher_district_banner');
  });
});

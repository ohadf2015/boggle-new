import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DistrictUpsellBanner } from '../DistrictUpsellBanner';

const t = (key: string) => key;

describe('DistrictUpsellBanner', () => {
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

  it('tracks click intent with data attribute', () => {
    render(<DistrictUpsellBanner t={t} language="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-ph-capture-attribute-source', 'teacher_district_banner');
  });
});

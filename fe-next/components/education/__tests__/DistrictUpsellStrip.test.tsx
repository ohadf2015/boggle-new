import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistrictUpsellStrip } from '../DistrictUpsellStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

describe('DistrictUpsellStrip', () => {
  beforeEach(() => mockTrackGrowthEvent.mockClear());

  it('renders title, body, and button', () => {
    render(<DistrictUpsellStrip />);
    expect(screen.getByText('education.landing.districtCta.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.districtCta.body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.landing.districtCta.button' })).toBeInTheDocument();
  });

  it('button is a mailto link with district pricing subject', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.districtCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('mailto:');
    expect(href).toContain('District');
  });

  it('calls trackGrowthEvent on button click', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.districtCta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'district_upsell' });
  });

  it('tracks district impression on mount', () => {
    render(<DistrictUpsellStrip />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'district_upsell' });
  });

  // Teacher individual lead-gen CTA (RED → GREEN)
  it('renders teacher lead title, body, and button', () => {
    render(<DistrictUpsellStrip />);
    expect(screen.getByText('education.landing.teacherLeadCta.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.teacherLeadCta.body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' })).toBeInTheDocument();
  });

  it('teacher button is a mailto link with Teacher subject', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('mailto:');
    expect(href).toContain('Teacher');
  });

  it('tracks teacher CTA impression on mount', () => {
    render(<DistrictUpsellStrip />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });
  });

  it('tracks teacher CTA click', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'teacher_individual' });
  });
});

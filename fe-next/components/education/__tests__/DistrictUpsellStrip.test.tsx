import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistrictUpsellStrip } from '../DistrictUpsellStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
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

  it('district button routes to the qualified For Schools lead form (not a raw mailto)', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.districtCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/education/for-schools');
    expect(href).not.toContain('mailto:');
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

  it('teacher button routes to the structured teacher access form (not a raw mailto)', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/education/access');
    expect(href).not.toContain('mailto:');
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

  describe('hideTeacherCta prop', () => {
    it('hides teacher CTA when hideTeacherCta=true', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      expect(screen.queryByText('education.landing.teacherLeadCta.title')).not.toBeInTheDocument();
    });

    it('still shows district CTA when hideTeacherCta=true', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      expect(screen.getByText('education.landing.districtCta.title')).toBeInTheDocument();
    });

    it('does not fire teacher impression when hideTeacherCta=true', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'district_upsell' });
    });
  });
});

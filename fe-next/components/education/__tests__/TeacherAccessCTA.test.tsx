import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeacherAccessCTA } from '../TeacherAccessCTA';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/animation/useGsapReveal', () => ({
  useGsapReveal: () => ({ current: null }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

describe('TeacherAccessCTA', () => {
  beforeEach(() => mockTrackGrowthEvent.mockClear());

  it('renders teacher access link', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: 'education.landing.cta.button' });
    expect(link).toHaveAttribute('href', '/en/education/access');
  });

  // The district CTA lives in `DistrictUpsellStrip` only — every landing page
  // renders that immediately after this one. This component used to duplicate
  // the exact same title/button/destination, so every page ended with 2x
  // identical "talk to us about your district" CTAs.
  it('renders exactly one link — no duplicate district CTA', () => {
    render(<TeacherAccessCTA />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('does not render district CTA copy', () => {
    render(<TeacherAccessCTA />);
    expect(screen.queryByText('education.landing.districtCta.title')).not.toBeInTheDocument();
    expect(screen.queryByText(/education\.landing\.districtCta\.button/)).not.toBeInTheDocument();
  });

  // RED → GREEN: telemetry
  it('tracks teacher CTA impression on mount', () => {
    render(<TeacherAccessCTA />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });
  });

  it('tracks teacher link click', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: 'education.landing.cta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'teacher_individual' });
  });

});

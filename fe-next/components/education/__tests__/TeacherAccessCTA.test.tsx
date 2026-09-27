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

  it('renders district pricing link pointing to for-schools', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: /education\.landing\.districtCta\.button/ });
    expect(link).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('shows district CTA title text', () => {
    render(<TeacherAccessCTA />);
    expect(screen.getByText('education.landing.districtCta.title')).toBeTruthy();
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

  it('tracks district link click', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: /education\.landing\.districtCta\.button/ });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'district_upsell' });
  });
});

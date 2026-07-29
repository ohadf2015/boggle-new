import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TeacherAccessCTA } from '../TeacherAccessCTA';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/animation/useGsapReveal', () => ({
  useGsapReveal: () => ({ current: null }),
}));

describe('TeacherAccessCTA', () => {
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
});

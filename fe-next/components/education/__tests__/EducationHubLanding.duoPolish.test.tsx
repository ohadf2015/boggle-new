import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import { EducationHero } from '../EducationHero';
import { ProFramingSection } from '../ProFramingSection';

describe('/education landing, Duolingo polish', () => {
  it('hero primary CTA uses the chunky press and keeps its test id', () => {
    render(<EducationHero />);
    const cta = screen.getByTestId('education-hero-free-cta');
    fireEvent.pointerDown(cta, { button: 0 });
    expect(cta).toHaveAttribute('data-pressed', 'true');
  });

  it('phone hero drops the free-plan note that the START FREE label already says', () => {
    render(<EducationHero />);
    expect(screen.getByText('eg2Land.hero.note')).toHaveClass('max-sm:hidden');
    expect(screen.getByTestId('education-hero-pro-cta')).toBeVisible();
  });

  it('hero sits on the ambient backdrop', () => {
    const { container } = render(<EducationHero />);
    expect(container.querySelector('[data-testid="education-hero"] [data-ambient]')).toBeInTheDocument();
  });

  it('Pro section content sits on the page, not inside one more boxed panel', () => {
    const { container } = render(<ProFramingSection cta={<button type="button">cta</button>} />);
    const wrapper = container.querySelector('#pro > div')!;
    expect(wrapper.className).not.toMatch(/\bborder-3\b|shadow-hard|bg-neo-navy-light/);
  });
});

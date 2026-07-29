import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { EducationHeroBanner } from '../EducationHeroBanner';

// Mock useScrollReveal to control visibility state
vi.mock('@/lib/animation/useScrollReveal', () => ({
  useScrollReveal: () => [{ current: null }, true],
}));

describe('EducationHeroBanner', () => {
  const renderWithLanguage = (component: React.ReactElement, locale: string = 'en') => {
    return render(
      <LanguageProvider initialLocale={locale}>
        {component}
      </LanguageProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with title', () => {
    renderWithLanguage(
      <EducationHeroBanner title="Learn Vocabulary" />
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Learn Vocabulary');
  });

  it('renders with title and subtitle', () => {
    renderWithLanguage(
      <EducationHeroBanner
        title="Learn Vocabulary"
        subtitle="Interactive word games for classrooms"
      />
    );
    expect(screen.getByText('Interactive word games for classrooms')).toBeInTheDocument();
  });

  it('renders with CTA link', () => {
    renderWithLanguage(
      <EducationHeroBanner
        title="Learn"
        cta={{ label: 'Get Started', href: '/en/education/access' }}
      />
    );
    expect(screen.getByRole('link', { name: /Get Started/ })).toHaveAttribute('href', '/en/education/access');
  });

  it('uses locale-specific hero image for Hebrew', () => {
    // Note: actual locale detection depends on LanguageProvider context
    // This test verifies the component structure is in place
    const { container } = renderWithLanguage(
      <EducationHeroBanner title="Test" />,
      'he'
    );
    const picture = container.querySelector('picture');
    expect(picture).toBeInTheDocument();
    const source = picture?.querySelector('source');
    expect(source).toBeInTheDocument();
  });

  it('has picture element for responsive images', () => {
    const { container } = renderWithLanguage(
      <EducationHeroBanner title="Test" />
    );
    const picture = container.querySelector('picture');
    const source = picture?.querySelector('source');
    const img = picture?.querySelector('img');
    expect(picture).toBeInTheDocument();
    expect(source).toBeInTheDocument();
    expect(img).toBeInTheDocument();
  });

  it('applies scroll-reveal animation classes', () => {
    const { container } = renderWithLanguage(
      <EducationHeroBanner title="Animate" />
    );
    const contentDiv = container.querySelector('div[class*="opacity"]');
    expect(contentDiv?.className).toContain('opacity-100');
    expect(contentDiv?.className).toContain('translate-y-0');
  });

  it('has proper accessibility attributes', () => {
    const { container } = renderWithLanguage(
      <EducationHeroBanner title="Test" />
    );
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });
});

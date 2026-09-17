import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { EducationHeroBanner } from '../EducationHeroBanner';

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

  // Image-only decorative banner: the H1 right below it already carries the
  // heading/subtitle text, so this component renders no duplicate copy.
  it('renders no heading text (no duplicate hero title)', () => {
    renderWithLanguage(<EducationHeroBanner />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('has picture element for responsive images', () => {
    const { container } = renderWithLanguage(<EducationHeroBanner />);
    const picture = container.querySelector('picture');
    const source = picture?.querySelector('source');
    const img = picture?.querySelector('img');
    expect(picture).toBeInTheDocument();
    expect(source).toBeInTheDocument();
    expect(img).toBeInTheDocument();
  });

  it('uses locale-specific hero image for Hebrew', () => {
    const { container } = renderWithLanguage(<EducationHeroBanner />, 'he');
    const picture = container.querySelector('picture');
    expect(picture).toBeInTheDocument();
    const source = picture?.querySelector('source');
    expect(source).toBeInTheDocument();
  });

  it('renders at full opacity immediately — no scroll-reveal opacity-0 initial state', () => {
    // Class 5 pitfall: a fullscreen/above-the-fold entrance tween that starts at
    // opacity-0 causes a mobile-web flash. This banner sits above the H1, so it
    // must never start invisible.
    const { container } = renderWithLanguage(<EducationHeroBanner />);
    expect(container.innerHTML).not.toContain('opacity-0');
  });

  it('has proper accessibility attributes (decorative image, hidden gradient overlay)', () => {
    const { container } = renderWithLanguage(<EducationHeroBanner />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });
});

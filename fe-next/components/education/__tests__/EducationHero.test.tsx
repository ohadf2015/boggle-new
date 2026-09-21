import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EducationHero } from '../EducationHero';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const mockTrackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...args: unknown[]) => mockTrackLandingCtaClick(...args),
}));

describe('EducationHero', () => {
  beforeEach(() => mockTrackLandingCtaClick.mockClear());

  it('renders a primary free-access path and a secondary Teacher Pro checkout CTA', () => {
    render(<EducationHero />);
    const free = screen.getByTestId('education-hero-free-cta');
    expect(free).toHaveAttribute('href', '/en/education/access');
    const pro = screen.getByTestId('education-hero-pro-cta');
    expect(pro).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(pro.textContent).toMatch(/\$9/);
  });

  it('no longer renders the secondary "see it in action" anchor', () => {
    render(<EducationHero />);
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(anchors.some((a) => (a.getAttribute('href') ?? '') === '#modes')).toBe(false);
  });

  it('tracks Pro and free hero CTA clicks separately', () => {
    render(<EducationHero />);
    fireEvent.click(screen.getByTestId('education-hero-pro-cta'));
    expect(mockTrackLandingCtaClick).toHaveBeenCalledWith('education_hero_pro');
    fireEvent.click(screen.getByTestId('education-hero-free-cta'));
    expect(mockTrackLandingCtaClick).toHaveBeenCalledWith('education_hero');
  });

  it('embeds the education-mode mock so visitors see it in action', () => {
    render(<EducationHero />);
    expect(screen.getByTestId('mock-join-code')).toBeInTheDocument();
  });

  it('renders a secondary schools link pointing to the for-schools page', () => {
    render(<EducationHero />);
    const link = screen.getByRole('link', { name: /education\.landing\.hero\.cta_schools/ });
    expect(link).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('tracks hero_for_schools when the schools link is clicked', () => {
    render(<EducationHero />);
    fireEvent.click(screen.getByRole('link', { name: /education\.landing\.hero\.cta_schools/ }));
    expect(mockTrackLandingCtaClick).toHaveBeenCalledWith('hero_for_schools');
  });

  it('renders free CTA as primary (lime, large, pulsing) and Pro as secondary (outlined)', () => {
    render(<EducationHero />);
    const free = screen.getByTestId('education-hero-free-cta');
    const pro = screen.getByTestId('education-hero-pro-cta');

    // Free CTA should be primary: lime background, large text
    expect(free.className).toMatch(/bg-neo-lime/);
    expect(free.className).toMatch(/text-lg/);
    expect(free.className).toMatch(/animate-pulse/);

    // Pro CTA should be secondary: outlined style, no pulse
    expect(pro.className).toMatch(/border-neo-cyan/);
    expect(pro.className).not.toMatch(/bg-neo-lime/);
    expect(pro.className).not.toMatch(/animate-pulse/);
  });

  it('ensures h1 and primary CTA precede the product mock in source order (mobile-first)', () => {
    const { container } = render(<EducationHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const primaryCTA = screen.getByTestId('education-hero-free-cta');
    const mockElement = screen.getByTestId('mock-join-code').closest('[data-hero-item]');

    // H1 should come before CTA (semantic order)
    expect(h1.compareDocumentPosition(primaryCTA) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Both should come before mock in DOM order (prevents mobile reflow pushing CTA off-screen)
    expect(h1.compareDocumentPosition(mockElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primaryCTA.compareDocumentPosition(mockElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the animated scholar mascot so the hero has real motion, not a still', () => {
    render(<EducationHero />);
    const mascot = Array.from(document.querySelectorAll('img')).find((img) =>
      (img.getAttribute('src') ?? '').includes('scholar'),
    );
    expect(mascot).toBeTruthy();
  });

  it('keeps the mascot decorative — hidden from assistive tech, copy carries the meaning', () => {
    render(<EducationHero />);
    const mascot = Array.from(document.querySelectorAll('img')).find((img) =>
      (img.getAttribute('src') ?? '').includes('scholar'),
    );
    expect(mascot?.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('does not apply unprefixed order-* classes to the mock (prevents mobile reflow)', () => {
    const { container } = render(<EducationHero />);
    const mockElement = screen.getByTestId('mock-join-code').closest('[data-hero-item]');
    const className = mockElement?.className ?? '';

    // Unprefixed `order-first` at every breakpoint would hoist mock above copy on mobile
    expect(className).not.toMatch(/\border-first\b/);
    expect(className).not.toMatch(/\border-last\b/);
    expect(className).not.toMatch(/\border-\d+\b/);
  });
});

/**
 * Piece A (shell), gauntlet round 3 (second run): the bottom third stops
 * stacking "list of links" blocks.
 *
 * Blind critic: "an FAQ accordion, a redundant plain-text link row (Play free
 * online / How to play / Strategy guides / From the blog / About us), and then
 * a huge multi-column footer ... fold the FAQ into a dedicated page or a
 * single 3-question teaser, and delete the duplicate link row entirely".
 *
 * So: the FAQ is a 3-question teaser whose "full FAQ" link sits in its header
 * row (visible at rest); the remaining questions stay in the HTML inside the
 * collapsed fold (FAQPage JSON-LD must match on-page copy). The link row is
 * gone; the editorial links the AdSense remediation needs
 * (HomepageContentSection.test) live inside ONE prose sentence. The locale
 * cross-link moves inline into the "What is LexiClash?" line.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';
import { LandingSEOSection } from '@/components/landing/LandingSEOSection';

let mockLocale = 'en';
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: mockLocale }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: mockLocale, dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: mockLocale, dir: 'ltr' }),
}));

const faq = Array.from({ length: 8 }, (_, i) => ({ question: `Q${i + 1}?`, answer: `A${i + 1}.` }));
const content = { title: 'LexiClash', description: 'LexiClash is a word game.', features: [], faq };

const faqRegion = () => screen.getByRole('region', { name: 'Frequently asked questions' });
const topLevelCards = (region: HTMLElement) =>
  [...region.querySelectorAll('details')].filter(
    (d) => !d.parentElement?.closest('details') && !d.hasAttribute('data-faq-more')
  );

describe('HomepageContentSection: a 3-question FAQ teaser', () => {
  it('shows exactly three questions as top-level cards', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    expect(topLevelCards(faqRegion()).map((d) => d.querySelector('summary')?.textContent)).toEqual([
      'Q1?',
      'Q2?',
      'Q3?',
    ]);
  });

  it('keeps the other questions in the HTML, folded', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const more = faqRegion().querySelector('details[data-faq-more]') as HTMLElement;
    expect(more).not.toBeNull();
    for (const item of faq.slice(3)) expect(within(more).getByText(item.answer)).toBeTruthy();
  });

  it('shows the full-FAQ link at rest, not inside a collapsed disclosure', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const link = within(faqRegion()).getByRole('link', { name: /homeFresh\.close\.faqAll/ });
    expect(link).toHaveAttribute('href', '/en/faq');
    expect(link.closest('details')).toBeNull();
  });

  it('adds no fold at three questions or fewer', () => {
    const { container } = render(
      <HomepageContentSection content={{ ...content, faq: faq.slice(0, 3) }} locale="en" />
    );
    expect(container.querySelector('details[data-faq-more]')).toBeNull();
  });
});

describe('HomepageContentSection: no duplicate link row', () => {
  it('renders no navigation landmark (the site footer is the one link block)', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    expect(container.querySelector('nav')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('carries the editorial links inside one prose sentence', () => {
    const { container } = render(<HomepageContentSection content={content} locale="he" />);
    const line = container.querySelector('p[data-home-tail="readmore"]') as HTMLElement;
    expect(line).not.toBeNull();
    const hrefs = [...line.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/he/how-to-play', '/he/guides', '/he/blog']);
  });

  it('no longer holds the locale cross-link', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    expect(screen.queryByText('homeFresh.close.crossLink')).toBeNull();
  });
});

describe('LandingSEOSection: the locale cross-link is inline in the what-is line', () => {
  it.each([
    ['en', '/en/play-boggle-online-free'],
    ['es', '/es/juego-de-palabras-multijugador'],
    ['sv', '/sv/swedish-multiplayer-word-game'],
  ])('%s links its landing from the what-is line', (locale, href) => {
    mockLocale = locale;
    const { container } = render(<LandingSEOSection />);
    const link = screen.getByRole('link', { name: /homeFresh\.close\.crossLink/ });
    expect(link).toHaveAttribute('href', href);
    expect(link.closest('[data-home-whatis]')).not.toBeNull();
    expect(container.querySelectorAll('nav, ul')).toHaveLength(0);
  });

  it('adds no cross-link where no such landing exists (he)', () => {
    mockLocale = 'he';
    render(<LandingSEOSection />);
    expect(screen.queryByText('homeFresh.close.crossLink')).toBeNull();
  });
});

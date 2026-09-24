/**
 * Piece A (shell), round 2: the homepage's reference tail (About + FAQ) gets
 * real hierarchy and room, and it no longer stacks straight onto the footer's
 * link columns.
 *
 * Round-1 blind critic: "The page's second half (FAQ accordion into a dense
 * multi-column footer of long-tail SEO links) is a wall of small, low-contrast
 * text ... give the FAQ real spacing/hierarchy instead of stacking it directly
 * onto the link dump."
 *
 * Kept on purpose (SEO/AdSense contract): server markup, native collapsed
 * <details> (zero JS), the same `content.faq` copy the FAQPage JSON-LD uses.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const content = {
  title: 'LexiClash — Free Multiplayer Word Game Online',
  description: 'LexiClash is a free online multiplayer word game.',
  features: ['Real-time multiplayer battles'],
  faq: [
    { question: 'What is LexiClash?', answer: 'A free multiplayer word game.' },
    { question: 'Is it free?', answer: 'Yes, completely free.' },
    { question: 'Can I play on my phone?', answer: 'Yes, in any browser.' },
  ],
};

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('HomepageContentSection: FAQ with real hierarchy', () => {
  it('gives the FAQ its own section-level (h2) heading, not a small h3', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const h = screen.getByRole('heading', { name: 'Frequently asked questions' });
    expect(h.tagName).toBe('H2');
  });

  it('labels a FAQ region by that heading, holding every question', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const region = screen.getByRole('region', { name: 'Frequently asked questions' });
    for (const item of content.faq) expect(within(region).getByText(item.question)).toBeTruthy();
  });

  it('renders each question as its own collapsed <details> card', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    const cards = container.querySelectorAll('details');
    expect(cards).toHaveLength(content.faq.length);
    for (const d of cards) {
      expect(d.hasAttribute('open')).toBe(false);
      // a separated card (own border), not a row in a divide-y stack
      expect(d.className).toMatch(/\bborder-2\b/);
      expect(d.className).toMatch(/\brounded-neo\b/);
    }
    // answers stay in the DOM for crawlers + the JSON-LD match
    for (const item of content.faq) expect(screen.getByText(item.answer)).toBeTruthy();
  });

  // Was: "ends with a sign-off" (a mascot line under the FAQ, no link, the
  // close section's PLAY above the whole tail). Round 5 (fourth run) moved the
  // close itself below the FAQ, so the footer still never abuts the FAQ list;
  // the finale is what sits between them (fresh.shell.ending.test).
  it('ends with the finale, so the footer never abuts the FAQ list', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    const section = container.querySelector('section[aria-label]');
    expect(section).not.toBeNull();
    const last = container.firstElementChild!.lastElementChild as HTMLElement;
    expect(last.contains(section)).toBe(false);
    expect(section!.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const finale = last.querySelector('[data-fresh-section="close"]') as HTMLElement;
    expect(within(finale).getByRole('heading', { name: 'homeFresh.close.title' })).toBeTruthy();
    // the FAQ block itself carries no PLAY competing with the finale
    expect(section!.querySelector('a[href$="/multiplayer"]')).toBeNull();
  });
});

describe('tail readability guards (no small low-contrast wall)', () => {
  const files = [
    'seo/HomepageContentSection.tsx',
    'landing/LandingSEOSection.tsx',
    'landing/LandingBlogSection.tsx',
  ];

  it.each(files)('%s keeps cream text at /80 opacity or higher', (f) => {
    const dim = read(f).match(/text-neo-cream\/([1-7]\d)\b/g) ?? [];
    expect(dim).toEqual([]);
  });

  it('the About + FAQ prose is not set in text-xs', () => {
    expect(read('seo/HomepageContentSection.tsx')).not.toMatch(/\btext-xs\b/);
  });

  it('drops the cramped two-column About|FAQ split', () => {
    expect(read('seo/HomepageContentSection.tsx')).not.toMatch(/grid-cols-\[2fr_3fr\]/);
  });
});

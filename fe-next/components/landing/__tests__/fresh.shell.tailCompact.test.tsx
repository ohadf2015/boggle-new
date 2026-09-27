/**
 * Piece A (shell), round 3: everything after the closing PLAY shrinks to
 * "almost nothing".
 *
 * Round-2 blind critic: "drop the stray thin cyan bar (it looks like a
 * leftover ad unit), compress the dense About paragraph to 1-2 sentences, cut
 * the FAQ from 8 items to 3-4 ...".
 *
 * Contract kept on purpose: the FAQPage JSON-LD (page.tsx) is built from the
 * WHOLE `content.faq`, and Google requires that copy to be on the page. So the
 * first four questions stay as cards and the rest fold into ONE collapsed
 * "more questions" disclosure: still in the server HTML, zero client JS, but
 * visually four rows. The About prose stays one element (AdSense reviewer
 * copy, HomepageContentSection.test) and is clamped to two lines.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const faq = Array.from({ length: 8 }, (_, i) => ({
  question: `Question number ${i + 1}?`,
  answer: `Answer number ${i + 1}.`,
}));

const content = {
  title: 'LexiClash, the multiplayer word game',
  description: 'LexiClash is a free online multiplayer word game. Find words on a shared grid. Race friends. Climb the board.',
  features: [],
  faq,
};

const faqRegion = () => screen.getByRole('region', { name: 'Frequently asked questions' });

describe('HomepageContentSection: FAQ shows three, folds the rest', () => {
  // Was four until the round-3 (second run) critic asked for "a single
  // 3-question teaser" (see fresh.shell.tailTeaser.test).
  it('shows only the first three questions as top-level cards', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const region = faqRegion();
    const topLevel = [...region.querySelectorAll('details')].filter(
      (d) => !d.parentElement?.closest('details') && !d.hasAttribute('data-faq-more')
    );
    expect(topLevel.map((d) => d.querySelector('summary')?.textContent)).toEqual(
      faq.slice(0, 3).map((f) => f.question)
    );
  });

  it('folds the remaining questions into one collapsed disclosure', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const more = faqRegion().querySelectorAll('details[data-faq-more]');
    expect(more).toHaveLength(1);
    expect(more[0].hasAttribute('open')).toBe(false);
    for (const item of faq.slice(3)) {
      expect(within(more[0] as HTMLElement).getByText(item.question)).toBeTruthy();
      expect(within(more[0] as HTMLElement).getByText(item.answer)).toBeTruthy();
    }
    expect(within(more[0] as HTMLElement).getByText('homeFresh.close.faqMore')).toBeTruthy();
  });

  it('keeps every question and answer in the DOM (FAQPage JSON-LD match)', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    for (const item of faq) {
      expect(within(faqRegion()).getByText(item.question)).toBeTruthy();
      expect(within(faqRegion()).getByText(item.answer)).toBeTruthy();
    }
  });

  it('points to the full FAQ page', () => {
    render(<HomepageContentSection content={content} locale="he" />);
    // he renders the Hebrew FAQ heading; the region is named by it
    const region = screen.getByRole('region', { name: 'שאלות נפוצות' });
    const link = within(region).getByRole('link', { name: /homeFresh\.close\.faqAll/ });
    expect(link).toHaveAttribute('href', '/he/faq');
  });

  it('adds no fold when there are three questions or fewer', () => {
    const { container } = render(
      <HomepageContentSection content={{ ...content, faq: faq.slice(0, 3) }} locale="en" />
    );
    expect(container.querySelector('details[data-faq-more]')).toBeNull();
  });
});

describe('HomepageContentSection: About is two lines, not a wall', () => {
  it('clamps the description, kept whole in one element', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const p = screen.getByText(content.description);
    expect(p.tagName).toBe('P');
    expect(p.className).toMatch(/\bline-clamp-2\b/);
  });

  it('drops the uppercase "About" eyebrow above the heading', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    expect(screen.queryByText('About LexiClash')).toBeNull();
  });
});

// The locale cross-link (en/es/sv) left this component's "Learn more" row when
// the row was deleted (round-3 critic: "delete the duplicate link row
// entirely"). Its en/es/sv/he coverage moved, unchanged in substance, to
// fresh.shell.tailTeaser.test ("the locale cross-link is inline in the what-is
// line"), which also asserts this component renders no nav at all.

/**
 * Piece A (shell), round 6: the FAQ is ONE card, the page's one accordion.
 *
 * Round-6 critic: "a dense FAQ paragraph ... a second FAQ accordion ... keep
 * one compact accordion max" and "the card/mascot visual language". Round 5
 * set the FAQ as fine print (small heading, a paragraph, outline rows, then a
 * differently styled "N more questions" text toggle, then a link sentence),
 * which read as several blocks and more than one accordion.
 *
 * Round 6: everything in the FAQ lives inside ONE card that rhymes with the
 * hero board (black border, pink hard shadow), with the thinking mascot riding
 * its corner. The "N more" fold wears exactly the same row shell as the
 * questions, so at rest the page shows one accordion of four rows. The
 * About prose stays visible (AdSense, HomepageContentSection.test) as the
 * card's two-line lead; every answer stays in the DOM (FAQPage JSON-LD).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const content = {
  title: 'LexiClash',
  description: 'LexiClash is a free online multiplayer word game. Find words on a shared grid.',
  features: [],
  faq: Array.from({ length: 8 }, (_, i) => ({ question: `Question ${i + 1}?`, answer: `Answer ${i + 1}.` })),
};

function renderFaq(locale = 'en') {
  const view = render(<HomepageContentSection content={content} locale={locale} />);
  const region = screen.getByRole('region', { name: locale === 'he' ? 'שאלות נפוצות' : 'Frequently asked questions' });
  const card = region.querySelector('[data-faq-card]') as HTMLElement;
  return { ...view, region, card };
}

const words = (cls: string) => cls.split(/\s+/).filter((w) => w && !/^group(\/|$)/.test(w)).sort();

describe('the FAQ is one card', () => {
  it('holds the headline, the About lead, every row and both link moments', () => {
    const { region, card } = renderFaq();
    expect(region.querySelectorAll('[data-faq-card]')).toHaveLength(1);
    expect(card.contains(screen.getByRole('heading', { name: 'Frequently asked questions' }))).toBe(true);
    expect(card.contains(screen.getByText(content.description))).toBe(true);
    for (const d of region.querySelectorAll('details')) expect(card.contains(d)).toBe(true);
    expect(card.contains(within(region).getByRole('link', { name: /homeFresh\.close\.faqAll/ }))).toBe(true);
    expect(card.contains(region.querySelector('p[data-home-tail="readmore"]'))).toBe(true);
  });

  it('rhymes with the hero board: black border, pink hard shadow that flips in RTL', () => {
    const { card } = renderFaq();
    expect(card.className).toMatch(/\bborder-3\b/);
    expect(card.className).toMatch(/\bborder-neo-black\b/);
    expect(card.className).toMatch(/\bbg-neo-navy-light\b/);
    expect(card.className).toContain('shadow-[7px_7px_0_0_var(--neo-pink)]');
    expect(card.className).toContain('rtl:shadow-[-7px_7px_0_0_var(--neo-pink)]');
  });

  it('carries the thinking mascot on its corner, painted as CSS (no <img> in the FAQ)', () => {
    const { region, card } = renderFaq();
    const mascot = card.querySelector('[data-faq-mascot]') as HTMLElement;
    expect(mascot).not.toBeNull();
    expect(mascot.getAttribute('aria-hidden')).toBe('true');
    expect(mascot.className).toContain('bg-[url(/mascot/bridge-think-nobg.webp)]');
    expect(region.querySelectorAll('img')).toHaveLength(0);
  });

  it('sets the FAQ headline at section scale', () => {
    renderFaq();
    const h = screen.getByRole('heading', { name: 'Frequently asked questions' });
    expect(h.className).toMatch(/\bfont-neo-display\b/);
    expect(h.className).toMatch(/\bmd:text-5xl\b/);
  });

  it('keeps the About lead at line scale, clamped, visible at rest', () => {
    renderFaq();
    const p = screen.getByText(content.description);
    expect(p.className).toMatch(/\bline-clamp-2\b/);
    expect(p.className).toMatch(/\bmd:text-lg\b/);
    expect(p.className).not.toMatch(/\btext-(xs|sm)\b/);
    expect(p.closest('details')).toBeNull();
  });
});

describe('one accordion: the fold is just another row', () => {
  it('shows four rows at rest: three questions and the fold', () => {
    const { card } = renderFaq();
    const rows = [...card.querySelectorAll('details')].filter((d) => !d.parentElement?.closest('details'));
    expect(rows).toHaveLength(4);
    expect(rows[3].hasAttribute('data-faq-more')).toBe(true);
    for (const d of rows) expect(d.hasAttribute('open')).toBe(false);
  });

  it('gives the fold the exact shell of a question row (details, summary and toggle tile)', () => {
    const { card } = renderFaq();
    const rows = [...card.querySelectorAll('details')].filter((d) => !d.parentElement?.closest('details'));
    const question = rows[0];
    const fold = rows[3];
    expect(words(fold.className)).toEqual(words(question.className));
    const qs = question.querySelector('summary') as HTMLElement;
    const fs = fold.querySelector('summary') as HTMLElement;
    expect(words(fs.className)).toEqual(words(qs.className));
    const qt = qs.querySelector('[data-faq-toggle]') as HTMLElement;
    const ft = fs.querySelector('[data-faq-toggle]') as HTMLElement;
    expect(qt).not.toBeNull();
    expect(ft).not.toBeNull();
    expect(words(ft.className)).toEqual(words(qt.className));
  });

  it("makes each toggle a game tile: cream, black-bordered, never a lime chip", () => {
    const { card } = renderFaq();
    for (const t of card.querySelectorAll<HTMLElement>('[data-faq-toggle]')) {
      expect(t.getAttribute('aria-hidden')).toBe('true');
      expect(t.className).toMatch(/\bbg-neo-cream\b/);
      expect(t.className).toMatch(/\bborder-neo-black\b/);
      expect(t.className).not.toMatch(/\bbg-neo-lime\b/);
    }
  });
});

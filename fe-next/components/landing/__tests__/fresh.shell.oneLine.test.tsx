/**
 * Piece A (shell), round 4: the page reads as ONE line (hero, daily, friends,
 * modes, languages, classrooms, one closing PLAY), not a stack of widgets.
 *
 * Round-3 blind critic: "Too many section types with jarring visual-language
 * switches back to back: purple CTA into lime CTA into a text-heavy two-column
 * 'What is / How to' spec box into photographic blog cards into an outlined
 * teal SEO banner. Cut the box ... move blog/FAQ off the main homepage flow."
 *
 * So: Classrooms joins the open section language of 2-5 (no second filled
 * slab next to the lime close card), and everything after the close is fine
 * print: no cards, no shadows, no colored tiles, no photos, no lime chips,
 * no section-scale headings. Content contract unchanged (whatIs/howToPlay,
 * every step, three /blog links, every FAQ answer), guarded elsewhere.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FreshClassrooms } from '../fresh/FreshClassrooms';
import { LandingSEOSection } from '../LandingSEOSection';
import { LandingBlogSection } from '../LandingBlogSection';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, isLoading: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
const classesIn = (root: Element) => [root, ...root.querySelectorAll('*')].map((e) => e.getAttribute('class') ?? '');

const content = {
  title: 'LexiClash',
  description: 'LexiClash is a free online multiplayer word game.',
  features: [],
  faq: Array.from({ length: 6 }, (_, i) => ({ question: `Q${i + 1}?`, answer: `A${i + 1}.` })),
};

describe('Classrooms joins the open section language', () => {
  it('is not a filled purple slab (no panel background, no xl card shadow)', () => {
    const { container } = render(<FreshClassrooms />);
    const s = container.querySelector('[data-fresh-section="classrooms"]')!;
    const panels = [...s.querySelectorAll('div, section')].filter((e) =>
      /\bbg-neo-purple\b|\bshadow-hard-xl\b/.test(e.getAttribute('class') ?? '')
    );
    expect(panels).toEqual([]);
    // the teacher CTA is still the one loud thing in it
    expect(s.querySelector('a[href="/en/education"]')).not.toBeNull();
  });
});

// Round 5 (fourth run): this block no longer trails the closing PLAY; it is
// ONE section BEFORE the finale (fresh.shell.ending.test). It keeps the quiet
// register below its one display headline, "How to Play".
describe('the reference section before the finale is quiet under one headline', () => {
  // Was: "the what-is / how-to explainer is not a card and has no colored step
  // tiles" (round 4's quiet register: no hard shadows, no border-3, no colored
  // fills anywhere in it). Superseded in round 6, on purpose: four rounds of
  // ever-quieter fine print still read as "an SEO content dump", and the lead
  // asked for a fundamentally different approach, so the steps are now the
  // hero's colored tiles (fresh.shell.r6.howToPlay.test). What stays: the
  // explainer itself is not a boxed panel and carries no photos.
  it('the how-to explainer is not a boxed panel and has no photos', () => {
    const { container } = render(<LandingSEOSection />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/\bshadow-hard/);
    expect(root.className).not.toMatch(/\bborder-3\b/);
    expect(root.className).not.toMatch(/\bbg-neo-(pink|cyan|lime|purple|navy-light)\b/);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('the blog is three text links: no photos, no boxed cards', () => {
    const { container } = render(<LandingBlogSection />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    for (const c of classesIn(container.firstElementChild!)) expect(c).not.toMatch(/\bshadow-hard/);
  });

  it('FAQ rows carry no lime chip and no lime glow when open', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    // the FAQ block; the lime finale band after it is the page's ending, not a row
    const faqBlock = container.querySelector('section[aria-label]')!;
    expect(faqBlock.querySelectorAll('details').length).toBeGreaterThan(0);
    for (const c of classesIn(faqBlock)) {
      expect(c).not.toMatch(/\bshadow-hard-lime\b/);
      expect(c).not.toMatch(/\bbg-neo-lime\b/);
      expect(c).not.toMatch(/open:border-neo-lime/);
    }
  });

  // Was an it.each over LandingBlogSection AND HomepageContentSection. Since
  // round 6 the FAQ card's headline is set at section scale on purpose
  // (fresh.shell.r6.faqCard.test), so HomepageContentSection gets the
  // one-headline guard below instead; the blog keeps the original rule.
  it.each(['landing/LandingBlogSection.tsx'])('%s uses no section-scale headings (text-2xl and up)', (f) => {
    expect(read(f)).not.toMatch(/\b(md:|sm:)?text-[2-9]xl\b/);
  });

  it('the FAQ block has exactly one section-scale element: its headline', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    const faqBlock = container.querySelector('section[aria-label]')!;
    const big = [...faqBlock.querySelectorAll('*')].filter((e) =>
      /\b(md:|sm:)?text-[2-9]xl\b/.test(e.getAttribute('class') ?? '')
    );
    expect(big).toHaveLength(1);
    expect(big[0].tagName).toBe('H2');
    expect(big[0].id).toBe('home-faq-title');
  });

  it('LandingSEOSection has exactly one section-scale element: the How to Play headline', () => {
    const { container } = render(<LandingSEOSection />);
    const big = [...container.querySelectorAll('*')].filter((e) =>
      /\b(md:|sm:)?text-[2-9]xl\b/.test(e.getAttribute('class') ?? '')
    );
    expect(big).toHaveLength(1);
    expect(big[0].tagName).toBe('H2');
    expect(big[0].id).toBe('home-how-title');
  });
});

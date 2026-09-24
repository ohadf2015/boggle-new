/**
 * Piece A (shell), round 3b: the tail after the closing PLAY reads as ONE
 * short reference block, not a second document.
 *
 * Round-3 blind critic: "after 'Ready? The board is waiting,' it dumps into an
 * SEO paragraph, an FAQ accordion, a promo banner, and a five-column link-farm
 * footer ... Cut that block down to one short trust/FAQ section".
 *
 * What made it read as a document was the heading count and the rules between
 * blocks (a border under the close card, a second "About" h2 duplicating
 * "What is LexiClash?", a "Learn more" h3 over three rows of pills, a dashed
 * rule over the sign-off). Content contract unchanged: every FAQ answer, the
 * About prose (visible, clamped), the editorial links, whatIs/howToPlay.
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
  title: 'LexiClash, the free multiplayer word game online',
  description: 'LexiClash is a free online multiplayer word game. Find words on a shared grid.',
  features: [],
  faq: Array.from({ length: 6 }, (_, i) => ({ question: `Q${i + 1}?`, answer: `A${i + 1}.` })),
};

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('HomepageContentSection: one FAQ block, one heading', () => {
  // Round 5 (fourth run): the component now also renders the page's finale
  // below the FAQ, whose one headline is the closing PLAY line. The FAQ block
  // itself still has exactly one heading and no second "About" heading.
  it('has a single h2 in the FAQ block (no "About" heading); the finale adds only its own', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    const faqBlock = container.querySelector('section[aria-label]') as HTMLElement;
    const faqHeadings = [...faqBlock.querySelectorAll('h1,h2,h3,h4')].map((h) => h.textContent);
    expect(faqHeadings).toEqual(['Frequently asked questions']);
    const headings = [...container.querySelectorAll('h1,h2,h3,h4')].map((h) => h.textContent);
    expect(headings).toEqual(['Frequently asked questions', 'homeFresh.close.title']);
    expect(screen.queryByRole('heading', { name: content.title })).toBeNull();
  });

  it('keeps the About prose visible as the FAQ lead-in', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    const region = screen.getByRole('region', { name: 'Frequently asked questions' });
    const p = within(region).getByText(content.description);
    expect(p.tagName).toBe('P');
    expect(p.closest('details')).toBeNull();
  });

  // Was: "turns 'Learn more' into one quiet row of links (>= 4 links)". The
  // round-3 (second run) critic called that row redundant with the footer;
  // the editorial links now sit inside one sentence
  // (fresh.shell.tailTeaser.test: "carries the editorial links inside one
  // prose sentence", "renders no navigation landmark").
});

describe('tail has no rules announcing a new document', () => {
  it('LandingView tail wrapper draws no top border under the close section', () => {
    expect(read('landing/LandingView.tsx')).not.toMatch(/border-t/);
  });

  // Was: "the sign-off has no dashed divider and no decorative tile row". The
  // sign-off merged into the finale band (fresh.shell.ending.test); the band's
  // one edge is its own top border where it meets the page, nothing dashed,
  // no tile row, and no rule between the FAQ and the band.
  it('the finale has no dashed divider and no decorative tile row', () => {
    const s = read('landing/fresh/FreshClose.tsx');
    expect(s).not.toMatch(/border-dashed/);
    expect(s).not.toMatch(/TILES/);
    expect(read('seo/HomepageContentSection.tsx')).not.toMatch(/border-t/);
  });
});

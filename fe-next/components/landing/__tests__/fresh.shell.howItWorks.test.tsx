/**
 * Piece A (shell), round 5: the tail after the closing PLAY is ONE simple
 * visual "how it works", not three columns of fine print.
 *
 * Round-4 critic: "The page decompresses into a content dump in its last
 * third: merge the What is / How to / blog columns into one simple visual
 * how-it-works (steps, one line each)". So:
 *   - one centered column (no side-by-side explainer | blog grid),
 *   - How to Play leads, each step is a picture + one line,
 *   - "What is LexiClash?" becomes one closing line under the steps,
 *   - the blog is one quiet row of title links (no date stack) whose
 *     "All articles" link sits in the row's heading line.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LandingSEOSection } from '../LandingSEOSection';
import { LandingBlogSection } from '../LandingBlogSection';
import { contentByLocale } from '../landingSEOContent';
import { getRecentBlogPostsForLocale } from '@/lib/blog/data';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const src = (f: string) => readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const c = contentByLocale.en;

describe('How it works (LandingSEOSection)', () => {
  // Was: "... its heading comes before the steps and the what-is line" (the
  // what-is closed the block as a bold question + answer under the steps).
  // Superseded in round 6: that bold Q&A read as "a dense FAQ paragraph", so
  // the what-is answer is now the section's line right under the headline and
  // its question is an sr-only heading (fresh.shell.r6.howToPlay.test).
  it('leads with How to Play: headline, then the what-is line, then the steps', () => {
    const { container } = render(<LandingSEOSection />);
    const headings = Array.from(container.querySelectorAll('h2,h3')).map((h) => h.textContent);
    expect(headings[0]).toBe(c.howToPlayTitle);
    expect(headings).toContain(c.whatIsTitle);
    const how = screen.getByRole('heading', { name: c.howToPlayTitle });
    const what = screen.getByRole('heading', { name: c.whatIsTitle });
    const list = container.querySelector('ol') as HTMLElement;
    // DOM order: How to Play heading → What is line → steps
    expect(how.compareDocumentPosition(what) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(what.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives every step its own decorative picture and one line of text', () => {
    const { container } = render(<LandingSEOSection />);
    const items = Array.from(container.querySelectorAll('ol > li'));
    expect(items).toHaveLength(c.steps.length);
    const accents = new Set<string>();
    items.forEach((li, i) => {
      const art = li.querySelector('[data-step-art]') as HTMLElement;
      expect(art).not.toBeNull();
      expect(art.getAttribute('aria-hidden')).toBe('true');
      accents.add(art.getAttribute('data-step-art') as string);
      expect(within(li as HTMLElement).getByText(c.steps[i])).toBeTruthy();
    });
    // color-coded: no two steps share an accent
    expect(accents.size).toBe(items.length);
  });

  it('keeps the what-is copy whole and visible', () => {
    render(<LandingSEOSection />);
    const p = screen.getByText(c.whatIsShort);
    expect(p.closest('details')).toBeNull();
    expect(p.className).not.toMatch(/\bsr-only\b|\bhidden\b/);
  });
});

// Was "Blog as one quiet row" (round 5), then "Blog as one collapsed row"
// (round 5, fourth run: the three links inside one closed <details>).
// Superseded in round 6: the critic counted that fold as one more accordion
// ("a second FAQ accordion"); the FAQ card keeps the page's ONE accordion and
// the blog is a visible list under a small heading (fresh.shell.r6.blog.test).
// The contract it kept: the three newest titles, one link each with no date
// stack, plus All articles, all in the server HTML (LandingView.ssr.test),
// none behind a JS entrance.
describe('Blog as one visible list (LandingBlogSection)', () => {
  it('is one list under the blog title, nothing folded', () => {
    const { container } = render(<LandingBlogSection />);
    expect(container.querySelectorAll('details, summary')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'homeFresh.close.blogTitle' })).toBeTruthy();
    expect(container.querySelectorAll('ul')).toHaveLength(1);
  });

  it('holds the three latest titles without a date stack, then All articles', () => {
    const { container } = render(<LandingBlogSection />);
    const items = container.querySelectorAll('ul > li');
    expect(items).toHaveLength(3);
    for (const li of Array.from(items)) {
      expect(li.querySelectorAll('a')).toHaveLength(1);
      expect(li.textContent?.trim()).toBe(li.querySelector('a')?.textContent?.trim());
    }
    const hrefs = Array.from(container.querySelectorAll('ul a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(getRecentBlogPostsForLocale('en', 3).map((p) => `/en/blog/${p.slug}`));
    const all = screen.getByRole('link', { name: /homeFresh\.close\.blogAll/ });
    expect(all).toHaveAttribute('href', '/en/blog');
  });
});

describe('LandingView tail layout', () => {
  it('stacks How to Play over the blog, not an explainer | blog two-column grid', () => {
    const s = src('LandingView.tsx');
    expect(s).not.toMatch(/md:grid-cols-\[1\.4fr_1fr\]/);
    expect(s).not.toMatch(/md:grid-cols-2/);
  });
});

/**
 * Piece A (shell), round 1: the SEO/blog tail under every homepage tree is
 * compressed and VISIBLE AT REST.
 *
 * Round-0 evidence: the full-page capture showed ~2,500px of empty navy under
 * the close card. LandingSEOSection sat in a `content-visibility: auto` box
 * (skipped off-screen), and every blog card started at framer-motion
 * `opacity: 0` waiting for whileInView. SPEC §2.7 + §3: keep whatIs and
 * howToPlay (SSR, single source), cap the blog at 3 cards, fold ModeShowcase,
 * WhoPlays and the community band into fresh sections 4 and 5.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('LandingSEOSection (compressed)', () => {
  it('keeps what-is and how-to-play, with every step', () => {
    render(<LandingSEOSection />);
    expect(screen.getByRole('heading', { name: c.whatIsTitle })).toBeTruthy();
    expect(screen.getByRole('heading', { name: c.howToPlayTitle })).toBeTruthy();
    expect(screen.getByText(c.whatIsShort)).toBeTruthy();
    for (const step of c.steps) expect(screen.getByText(step)).toBeTruthy();
  });

  it('drops the sections folded into fresh sections 4 and 5', () => {
    render(<LandingSEOSection />);
    for (const title of [c.featuresTitle, c.whoCanPlayTitle, c.communityTitle]) {
      expect(screen.queryByRole('heading', { name: title })).toBeNull();
    }
  });

  it('is never skipped or hidden while off-screen', () => {
    const s = src('LandingSEOSection.tsx');
    expect(s).not.toMatch(/content-visibility/);
    expect(s).not.toMatch(/from ['"]framer-motion['"]/);
  });
});

describe('LandingBlogSection (compressed)', () => {
  // Round 6: the three links are one visible list under a small heading (no
  // fold: the FAQ card is the page's one accordion). Still server HTML, still
  // never behind a JS entrance (the round-1 bug this guards).
  it('renders the three latest posts as plain links, never behind a JS entrance', () => {
    const { container } = render(<LandingBlogSection />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const post of getRecentBlogPostsForLocale('en', 3)) expect(hrefs).toContain(`/en/blog/${post.slug}`);
    expect(hrefs).toContain('/en/blog');
    for (const el of container.querySelectorAll<HTMLElement>('[style]')) {
      expect(el.style.opacity).not.toBe('0');
    }
  });

  // Was: read the blog title off the disclosure's <summary>. Superseded in
  // round 6: the blog is a visible list under a small heading, no disclosure
  // (fresh.shell.r6.blog.test). Same keys, same chrome.
  it('takes its chrome from homeFresh.close keys (all six locales, incl. ru)', () => {
    render(<LandingBlogSection />);
    expect(screen.getByRole('heading', { name: 'homeFresh.close.blogTitle' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /homeFresh\.close\.blogAll/ })).toHaveAttribute('href', '/en/blog');
  });

  it('uses no entrance animation library', () => {
    expect(src('LandingBlogSection.tsx')).not.toMatch(/from ['"]framer-motion['"]/);
  });
});

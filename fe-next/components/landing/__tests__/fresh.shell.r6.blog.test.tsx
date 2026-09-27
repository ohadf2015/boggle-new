/**
 * Piece A (shell), round 6: the blog is one visible list, never a disclosure.
 *
 * Round-6 critic: "... a second FAQ accordion ...". In round 5 the blog was a
 * collapsed <details> row, the FAQ had a second "N more" toggle styled
 * differently, and the what-is line read as a Q&A: to a reader, several
 * accordions stacked. HIG (disclosure-controls.md): "Use no more than one
 * disclosure button in a single view." So the FAQ keeps the page's ONE
 * accordion and the blog is three plain title links under a small heading,
 * each held to one line on a phone (the full title stays in the link for
 * crawlers and screen readers), with All articles beside the heading.
 *
 * The tail spans the story width now (sections 2-6), not a narrow fine-print
 * column.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LandingBlogSection } from '../LandingBlogSection';
import { blogPostsContent, getRecentBlogPostsForLocale } from '@/lib/blog/data';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Blog: one visible list, no disclosure', () => {
  it('renders no <details>/<summary>: nothing to open', () => {
    const { container } = render(<LandingBlogSection />);
    expect(container.querySelectorAll('details, summary')).toHaveLength(0);
  });

  it('is headed by the blog title as a small heading', () => {
    render(<LandingBlogSection />);
    const h = screen.getByRole('heading', { name: 'homeFresh.close.blogTitle' });
    expect(h.tagName).toBe('H3');
    expect(h.className).not.toMatch(/\b(md:|sm:)?text-[2-9]xl\b/);
  });

  it('holds each of the three newest titles to one line on a phone, full title kept in the link', () => {
    const { container } = render(<LandingBlogSection />);
    const posts = getRecentBlogPostsForLocale('en', 3);
    const links = [...container.querySelectorAll('ul a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(posts.map((p) => `/en/blog/${p.slug}`));
    links.forEach((a, i) => {
      const title = blogPostsContent.en.posts[posts[i].slug].title;
      expect(a.textContent?.trim()).toBe(title);
      const clamp = [...a.querySelectorAll('span')].find((s) => s.textContent === title) as HTMLElement;
      expect(clamp).toBeTruthy();
      expect(clamp.className).toMatch(/(^|\s)truncate(\s|$)/);
    });
  });

  it('shows All articles at rest', () => {
    render(<LandingBlogSection />);
    const all = screen.getByRole('link', { name: /homeFresh\.close\.blogAll/ });
    expect(all).toHaveAttribute('href', '/en/blog');
    expect(all.closest('details')).toBeNull();
    expect(all.closest('ul')).toBeNull();
  });
});

describe('the tail is story width', () => {
  it('LandingView tail wrapper uses the width of sections 2-6', () => {
    expect(read('LandingView.tsx')).toMatch(/data-home-tail="tail"[\s\S]{0,200}max-w-6xl/);
  });
});

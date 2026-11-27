import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));

import { BlogPostLayout, BlogSections } from '../BlogPostLayout';

const sections = [{ title: 'Sources', content: 'Plain first.\n\nSee [a study](https://example.org/x).' }];

describe('BlogSections', () => {
  it('splits paragraphs and renders source links only when linkify is on', () => {
    const { container, rerender } = render(<BlogSections sections={sections} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelector('a')).toBeNull();

    rerender(<BlogSections sections={sections} linkify />);
    expect(screen.getByRole('link', { name: 'a study' }).getAttribute('href')).toBe('https://example.org/x');
  });
});

describe('BlogPostLayout', () => {
  const base = { locale: 'en', backLabel: 'Back', category: 'Guide', title: 'Title', readTime: '5 min', ctas: [{ href: '/en/daily', label: 'Play' }] };

  it('draws one back arrow even when the translated label carries its own', () => {
    render(
      <BlogPostLayout {...base} backLabel="← Back to Blog">
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByRole('link', { name: 'Back to Blog' }).textContent).toBe('Back to Blog');
  });

  it('shows the byline instead of a date row when no date is given, and links back to the given index', () => {
    const { container } = render(
      <BlogPostLayout {...base} byline="Ohad Fisher" backHref="/en/guides">
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByText('Ohad Fisher')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{4}/);
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/en/guides');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Title');
  });

  it('formats the publish date and defaults the back link to the blog', () => {
    render(
      <BlogPostLayout {...base} date="2026-03-28">
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/en/blog');
  });
});

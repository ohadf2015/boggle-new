import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogProse } from '../BlogProse';
import { contentByLocale } from '@/app/[locale]/blog/science-behind-word-games/content';

describe('BlogProse', () => {
  it('given plain prose, then it renders the text unchanged with no links', () => {
    const { container } = render(<BlogProse text="Just words, no sources." />);
    expect(container.textContent).toBe('Just words, no sources.');
    expect(container.querySelector('a')).toBeNull();
  });

  it('given a markdown link to an https source, then it renders an outbound link with the label', () => {
    render(<BlogProse text="- [Verghese et al. (2003)](https://doi.org/10.1056/NEJMoa022252), n=469" />);
    const link = screen.getByRole('link', { name: 'Verghese et al. (2003)' });
    expect(link.getAttribute('href')).toBe('https://doi.org/10.1056/NEJMoa022252');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.parentElement?.textContent).toBe('- Verghese et al. (2003), n=469');
  });

  it('given a link that is not https, then it stays as plain text', () => {
    const { container } = render(<BlogProse text="[bad](javascript:alert(1))" />);
    expect(container.querySelector('a')).toBeNull();
  });
});

describe('science-behind-word-games sources', () => {
  it.each(Object.keys(contentByLocale))('every source line in %s links to its original', (locale) => {
    const sections = contentByLocale[locale].sections;
    const sources = sections[sections.length - 1].content.split('\n').filter((l) => l.startsWith('- '));
    expect(sources.length).toBeGreaterThan(0);
    for (const line of sources) expect(line, line).toMatch(/\[[^\]]+\]\(https:\/\/[^)\s]+\)/);
  });
});

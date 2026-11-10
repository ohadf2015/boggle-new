import { describe, it, expect } from 'vitest';
import { prefersMarkdown, renderHomeMarkdown } from '../markdownHome';

describe('prefersMarkdown', () => {
  it('accepts an explicit markdown request', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true);
    expect(prefersMarkdown('text/markdown, text/html;q=0.8')).toBe(true);
  });
  it('leaves browsers and wildcards on HTML', () => {
    expect(prefersMarkdown(undefined)).toBe(false);
    expect(prefersMarkdown('text/html,application/xhtml+xml,*/*;q=0.8')).toBe(false);
    expect(prefersMarkdown('*/*')).toBe(false);
    expect(prefersMarkdown('text/markdown;q=0')).toBe(false);
    expect(prefersMarkdown('text/html, text/markdown;q=0.5')).toBe(false);
  });
});

describe('renderHomeMarkdown', () => {
  it('carries the homepage title and FAQ', () => {
    const md = renderHomeMarkdown();
    expect(md.startsWith('# LexiClash')).toBe(true);
    expect(md).toContain('### Is LexiClash free to play?');
  });
});

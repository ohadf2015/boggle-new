import { describe, it, expect } from 'vitest';
import { buildEmbedSnippet } from './embedSnippet';

describe('buildEmbedSnippet', () => {
  it('should return an iframe snippet with correct src for en locale', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('src="https://www.lexiclash.live/en/embed/word-of-the-day"');
  });

  it('should return an iframe snippet with correct src for he locale', () => {
    const snippet = buildEmbedSnippet('he');
    expect(snippet).toContain('src="https://www.lexiclash.live/he/embed/word-of-the-day"');
  });

  it('should return an iframe snippet with correct src for sv locale', () => {
    const snippet = buildEmbedSnippet('sv');
    expect(snippet).toContain('src="https://www.lexiclash.live/sv/embed/word-of-the-day"');
  });

  it('should return an iframe snippet with correct src for ja locale', () => {
    const snippet = buildEmbedSnippet('ja');
    expect(snippet).toContain('src="https://www.lexiclash.live/ja/embed/word-of-the-day"');
  });

  it('should return an iframe snippet with correct src for es locale', () => {
    const snippet = buildEmbedSnippet('es');
    expect(snippet).toContain('src="https://www.lexiclash.live/es/embed/word-of-the-day"');
  });

  it('should include loading="lazy" attribute', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('loading="lazy"');
  });

  it('should include border:0 in style attribute', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('style="');
    expect(snippet).toContain('border:0');
  });

  it('should include width and height attributes', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('width=');
    expect(snippet).toContain('height=');
  });

  it('should include a title attribute', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('title=');
  });

  it('should use custom origin when provided', () => {
    const snippet = buildEmbedSnippet('en', 'https://custom.example.com');
    expect(snippet).toContain('src="https://custom.example.com/en/embed/word-of-the-day"');
  });

  it('should default to lexiclash.live when no origin provided', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('https://www.lexiclash.live');
  });

  it('should return valid iframe HTML string', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toMatch(/^<iframe\s+/);
    expect(snippet).toMatch(/<\/iframe>$/);
  });

  it('should have width 100% and max-width 360px', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('width="100%"');
    expect(snippet).toContain('max-width: 360px');
  });

  it('should have height approximately 300px', () => {
    const snippet = buildEmbedSnippet('en');
    expect(snippet).toContain('height="320"');
  });
});

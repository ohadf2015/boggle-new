import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

function enFields(source: string): string[] {
  return [...source.matchAll(/^\s*en: '([^']+)',$/gm)].map((m) => m[1]);
}

describe('best-boggle-alternatives-2026 snippet', () => {
  const page = readFileSync(join(dir, 'page.tsx'), 'utf8');
  const [title, description] = enFields(page);

  it('EN title leads with the number and Free, and fits 50-60', () => {
    expect(title.startsWith('6 Free ')).toBe(true);
    expect(title).toContain('Games Like Boggle');
    expect(title).toContain('No Signup');
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('EN description leads with the hook and fits 120-160', () => {
    expect(description.startsWith('6 free games like Boggle, no signup')).toBe(true);
    expect(description).toContain('live multiplayer');
    expect(description).toContain('6 languages');
    expect(description).not.toContain('Wordle');
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('EN body keeps exactly six numbered alternatives, matching the title', async () => {
    const { contentByLocale } = await import('./content');
    const numbered = contentByLocale.en.sections.filter((s) => /^\d+\. /.test(s.title ?? ''));
    expect(numbered).toHaveLength(6);
    const slugs = contentByLocale.en.sections.map((s) => s.slug);
    for (const slug of ['games-like-boggle-online', 'games-like-boggle-party', 'boggle-on-netflix', 'best-boggle-app']) {
      expect(slugs).toContain(slug);
    }
  });

  it('leaves the English H1 alone', () => {
    const content = readFileSync(join(dir, 'content.ts'), 'utf8');
    expect(content).toContain(
      "title: 'I Tried Every Boggle Alternative I Could Find. Most of Them Suck.'",
    );
  });
});

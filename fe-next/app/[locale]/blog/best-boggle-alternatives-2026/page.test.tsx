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

  it('EN title leads with Best and contains Games Like Boggle, and fits 50-60', () => {
    expect(title.startsWith('Best ')).toBe(true);
    expect(title).toContain('Games Like Boggle');
    expect(title).toContain('No Signup');
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('EN description leads with the hook and fits 120-160', () => {
    expect(description.startsWith('Find the best free word games like Boggle')).toBe(true);
    expect(description).toContain('live multiplayer');
    expect(description).toContain('6 languages');
    expect(description).not.toContain('Wordle');
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('leaves the English H1 alone', () => {
    const content = readFileSync(join(dir, 'content.ts'), 'utf8');
    expect(content).toContain(
      "title: 'I Tried Every Boggle Alternative I Could Find. Most of Them Suck.'",
    );
  });
});

import { describe, it, expect } from 'vitest';
import { buildDynamicTitle, buildDynamicDescription, buildSchemas } from './seo';
import type { WordEntry } from './content';

const heWord: WordEntry = {
  word: 'תעלומה',
  definition: 'דבר שקשה להסבירו או להבינו; סוד.',
  etymology: 'מהשורש ע.ל.מ — "נעלם", "נסתר".',
  example: 'היעלמות הספינה נותרה תעלומה עד היום.',
  funFact: 'ספרות הבלשים בעברית נקראת "ספרות תעלומה".',
  difficulty: 'easy',
  partOfSpeech: 'שם עצם',
  dateKey: '2026-03-08',
};

describe('buildDynamicTitle', () => {
  it('embeds Hebrew label, word, and HE-formatted date', () => {
    const t = buildDynamicTitle('he', heWord);
    expect(t).toContain('מילת היום');
    expect(t).toContain('תעלומה');
    expect(t).toContain('2026');
    expect(t).toContain('LexiClash');
  });

  it('uses English label for en locale', () => {
    const t = buildDynamicTitle('en', { ...heWord, word: 'Quixotic' });
    expect(t).toContain('Word of the Day');
    expect(t).toContain('Quixotic');
  });
});

describe('buildDynamicDescription', () => {
  it('includes word and definition for HE', () => {
    const d = buildDynamicDescription('he', heWord);
    expect(d).toContain('תעלומה');
    expect(d).toContain('סוד');
  });

  it('truncates long definitions to 140 chars + ellipsis', () => {
    const long: WordEntry = { ...heWord, definition: 'x'.repeat(200) };
    const d = buildDynamicDescription('he', long);
    expect(d).toMatch(/…$/);
    // word + label + truncated definition all fit within ~190
    expect(d.length).toBeLessThan(220);
  });
});

describe('buildSchemas', () => {
  const schemas = buildSchemas('he', heWord, '/he/word-of-the-day/2026-03-08');

  it('includes BreadcrumbList with 3 items', () => {
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect((breadcrumb as { itemListElement: unknown[] }).itemListElement).toHaveLength(3);
  });

  it('emits Article schema with datePublished/dateModified ISO timestamps', () => {
    const article = schemas.find((s) => s['@type'] === 'Article') as
      | { datePublished: string; dateModified: string; inLanguage: string }
      | undefined;
    expect(article).toBeDefined();
    expect(article?.datePublished).toBe('2026-03-08T00:00:00Z');
    expect(article?.dateModified).toBe('2026-03-08T00:00:00Z');
    expect(article?.inLanguage).toBe('he-IL');
  });

  it('tags DefinedTerm with inLanguage', () => {
    const dt = schemas.find((s) => s['@type'] === 'DefinedTerm') as
      | { inLanguage: string; name: string }
      | undefined;
    expect(dt?.inLanguage).toBe('he-IL');
    expect(dt?.name).toBe('תעלומה');
  });
});

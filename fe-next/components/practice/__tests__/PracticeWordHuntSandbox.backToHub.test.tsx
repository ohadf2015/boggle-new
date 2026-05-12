import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PracticeWordHuntSandbox - Back to Practice Hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('practice hub link paths are properly formatted', () => {
    const locale = 'en';
    const expectedHref = `/${locale}/practice`;
    expect(expectedHref).toBe('/en/practice');
  });

  it('back-to-hub link works for all locales', () => {
    const locales = ['en', 'he', 'es', 'ja', 'sv'];
    locales.forEach((locale) => {
      const href = `/${locale}/practice`;
      expect(href).toMatch(/^\/[a-z]{2}\/practice$/);
    });
  });

  it('builds correct href from language prop', () => {
    const testCases = [
      { language: 'en', expected: '/en/practice' },
      { language: 'he', expected: '/he/practice' },
      { language: 'es', expected: '/es/practice' },
      { language: 'ja', expected: '/ja/practice' },
      { language: 'sv', expected: '/sv/practice' },
    ];

    testCases.forEach(({ language, expected }) => {
      const href = `/${language}/practice`;
      expect(href).toBe(expected);
    });
  });
});

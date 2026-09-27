// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page from '../page';

describe('sight-words-practice Practice-now tiles', () => {
  it('points Flashcards, Word Matching, and Spelling Challenge at guest-playable drills, never TeacherGate', async () => {
    const { container } = render(
      await Page({ params: Promise.resolve({ locale: 'en' }) })
    );

    const practiceLinks = [...container.querySelectorAll('a')].filter((a) =>
      (a.textContent || '').includes('Practice now')
    );
    const hrefs = practiceLinks.map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual([
      '/en/daily/word-hunt',
      '/en/daily/word-wheel',
      '/en/singleplayer',
      '/en/education/duels',
    ]);
    expect(hrefs.some((h) => h?.includes('/teacher'))).toBe(false);
    expect(hrefs.some((h) => h?.includes('classroom-game'))).toBe(false);
  });
});

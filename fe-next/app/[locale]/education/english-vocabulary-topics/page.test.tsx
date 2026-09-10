// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('english-vocabulary-topics page', () => {
  describe('Spanish locale rendering', () => {
    it('renders Spanish strings from content.ts and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      expect(text).toContain('Vocabulario en inglés por temas');
      expect(text).toContain('Gratis para empezar');
      expect(text).not.toContain('English vocabulary by topic');
      expect(text).not.toContain('Built for topic vocabulary');
    });
  });

  describe('English locale rendering', () => {
    it('renders topic word lists and links into a playable mode plus the hub', async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(meta.title).toContain('English Vocabulary by Topic');

      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'en' }) })
      );
      const text = container.textContent || '';
      expect(text.toLowerCase()).toContain('food');
      expect(text.toLowerCase()).toContain('animals');
      expect(text.toLowerCase()).toContain('travel');
      expect(text.toLowerCase()).toContain('school');
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((h) => h.includes('/daily/word-hunt') || h.includes('/education/classroom-game'))).toBe(true);
      expect(hrefs.some((h) => /\/education\/?$/.test(h))).toBe(true);
    });
  });
});

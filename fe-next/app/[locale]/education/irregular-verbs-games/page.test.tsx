// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('irregular-verbs-games page', () => {
  describe('Spanish locale rendering', () => {
    it('renders Spanish strings from content.ts and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      expect(text).toContain('Juegos de verbos irregulares');
      expect(text).toContain('Gratis para empezar');
      expect(text).not.toContain('Irregular verb games');
      expect(text).not.toContain('Built for irregular-verb drills');
    });
  });

  describe('English locale rendering', () => {
    it('renders English metadata, FAQ, and spelling plus classroom CTAs', async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(meta.title).toContain('Irregular Verb Games');

      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'en' }) })
      );
      const text = container.textContent || '';
      expect(text).toContain('How do I practise irregular verbs');
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((h) => h.includes('/education/classroom-game'))).toBe(true);
      expect(hrefs.some((h) => /\/education\/?$/.test(h))).toBe(true);
    });
  });
});

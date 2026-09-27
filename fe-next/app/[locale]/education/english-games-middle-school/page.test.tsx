// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('english-games-middle-school page', () => {
  describe('Spanish locale rendering', () => {
    it('renders Spanish strings from content.ts and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      expect(text).toContain('Juegos de inglés para secundaria');
      expect(text).toContain('Gratis para empezar');
      expect(text).not.toContain('English games for middle school');
      expect(text).not.toContain('Built for teen English learners');
    });
  });

  describe('English locale rendering', () => {
    it('renders English metadata and links into classroom, duels, and the hub', async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(meta.title).toContain('English Games for Middle School');

      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'en' }) })
      );
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((h) => h.includes('/education/classroom-game'))).toBe(true);
      expect(hrefs.some((h) => h.includes('/education/duels'))).toBe(true);
      expect(hrefs.some((h) => /\/education\/?$/.test(h))).toBe(true);
    });
  });
});

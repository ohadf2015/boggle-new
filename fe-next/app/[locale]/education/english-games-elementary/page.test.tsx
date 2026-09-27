// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('english-games-elementary page', () => {
  describe('Spanish locale rendering', () => {
    it('renders Spanish strings from content.ts and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      expect(text).toContain('Juegos de inglés para primaria');
      expect(text).toContain('Gratis para empezar');
      expect(text).not.toContain('English word games for elementary');
      expect(text).not.toContain('Built for young English learners');
    });
  });

  describe('English locale rendering', () => {
    it('renders English metadata and classroom plus hub links', async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(meta.title).toContain('English Word Games for Elementary');
      expect(meta.description).toMatch(/elementary|primary|young/i);

      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'en' }) })
      );
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((h) => h.includes('/education/classroom-game'))).toBe(true);
      expect(hrefs.some((h) => h.endsWith('/education') || h.includes('/education"'))).toBe(true);
      expect(hrefs.some((h) => /\/education\/?$/.test(h) || h.includes('/education?') || h.endsWith('/education'))).toBe(true);
    });
  });
});

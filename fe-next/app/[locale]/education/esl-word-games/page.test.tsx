// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('esl-word-games page', () => {
  describe('Spanish locale rendering', () => {
    it('renders Spanish strings from content.ts and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      // Assert Spanish content is rendered
      expect(text).toContain('Construido para estudiantes de inglés');
      expect(text).toContain('Escala al nivel CEFR');
      // Updated to match the polished Spanish translation (removed "para")
      expect(text).toContain('Gratis Siempre');

      // Assert English hardcoded strings are NOT present
      expect(text).not.toContain('Built for English learners');
      expect(text).not.toContain('Scale to CEFR');
    });
  });
});

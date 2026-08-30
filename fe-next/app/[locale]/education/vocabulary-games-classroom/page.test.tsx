// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from './page';

describe('vocabulary-games-classroom page', () => {
  describe('Hebrew locale rendering', () => {
    it('renders Hebrew strings from content.ts and not English when locale=he', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'he' }) })
      );
      const text = container.textContent || '';

      // Assert Hebrew content is rendered
      // Updated to match actual polished content: features now say "דו־קרבות 1v1"
      expect(text).toContain('דו־קרבות 1v1');
      expect(text).toContain('6 שפות'); // Six locales ship: en he sv ja es ru
      expect(text).toContain('דו־קרבות'); // 1v1 duels

      // Assert English hardcoded strings are NOT present (these would indicate hardcoding)
      // Only check representative ones that should be translated
      expect(text).not.toContain('Free student accounts — quick signup');
    });
  });

  describe('Spanish locale rendering', () => {
    it('renders Spanish strings and not English when locale=es', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      const text = container.textContent || '';

      // Assert Spanish content is rendered
      expect(text).toContain('Cuentas de estudiantes gratis');
      // Six locales ship (en he sv ja es ru) — this used to assert "5 idiomas"
      expect(text).toContain('6 idiomas');
      // Updated to match actual feature text: "Duelos 1v1"
      expect(text).toContain('Duelos 1v1');
    });
  });

  describe('English locale rendering', () => {
    it('renders English metadata and content when locale=en', async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(meta.title).toContain('Free Classroom Vocabulary Games');
      expect(meta.description).toContain('Free vocabulary games for the classroom');
    });
  });
});

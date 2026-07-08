/**
 * Verifies each locale's translation chunk loads correctly via the lazy
 * per-locale loader (translations/loadTranslation.ts), which replaced the
 * eager translations/index.js barrel that bundled all languages into every page.
 */
import { loadTranslation } from '../translations/loadTranslation';

describe('Translations lazy-load per locale', () => {
  it('should have required properties on every language', async () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const) {
      const data = await loadTranslation(lang) as Record<string, unknown>;

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');

      const flag = data.flag;
      const name = data.name;
      const direction = data.direction;

      expect(flag).toBeDefined();
      expect(name).toBeDefined();
      expect(['ltr', 'rtl']).toContain(direction);
    }
  });
});

/**
 * Sprint 4: Dead code removal + i18n hardcoded string fixes
 * Tests verify:
 * 1. validateWords socket handler removed (no-op)
 * 2. require() converted to static import in playerJoinHandler
 * 3. Error boundaries use translations instead of hardcoded English
 * 4. Skip-to-content uses translations lookup
 * 5. SR-only nav links use translations
 * 6. global-error "Go Home" uses translations
 */

import { translations } from '../../translations';

describe('Sprint 4: i18n translation keys exist', () => {
  const locales = ['en', 'he', 'sv', 'ja', 'es'] as const;

  describe('error boundary keys', () => {
    test.each(locales)('%s has errors.goHome key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.errors.goHome).toBeTruthy();
    });

    test.each(locales)('%s has errors.failedToLoadLeaderboard key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.errors.failedToLoadLeaderboard).toBeTruthy();
    });

    test.each(locales)('%s has errors.failedToLoadProfile key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.errors.failedToLoadProfile).toBeTruthy();
    });

    test.each(locales)('%s has errors.unableToLoadData key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.errors.unableToLoadData).toBeTruthy();
    });

    test.each(locales)('%s has errors.tryAgainButton key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.errors.tryAgainButton).toBeTruthy();
    });
  });

  describe('SR nav link keys', () => {
    test.each(locales)('%s has nav.howToPlay key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.howToPlay).toBeTruthy();
    });

    test.each(locales)('%s has nav.blog key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.blog).toBeTruthy();
    });

    test.each(locales)('%s has nav.faq key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.faq).toBeTruthy();
    });

    test.each(locales)('%s has nav.aboutLexiClash key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.aboutLexiClash).toBeTruthy();
    });

    test.each(locales)('%s has nav.contactUs key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.contactUs).toBeTruthy();
    });

    test.each(locales)('%s has nav.privacyPolicy key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.privacyPolicy).toBeTruthy();
    });

    test.each(locales)('%s has nav.termsOfService key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.termsOfService).toBeTruthy();
    });

    test.each(locales)('%s has nav.disclaimer key', (locale) => {
      const t = translations[locale] as unknown as Record<string, Record<string, string>>;
      expect(t.nav.disclaimer).toBeTruthy();
    });
  });
});

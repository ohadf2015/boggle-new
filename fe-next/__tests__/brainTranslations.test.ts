/**
 * Brain Translation Keys Test
 *
 * Verifies that all brain.tiers and brain.tips translation keys exist
 * in all supported language files.
 */

const { en } = require('../translations/en.js');
const { he } = require('../translations/he.js');
const { sv } = require('../translations/sv.js');
const { ja } = require('../translations/ja.js');
const { es } = require('../translations/es.js');

// Required tier keys based on BrainTier type in shared/types/cognitive.ts
const REQUIRED_TIERS = ['novice', 'apprentice', 'intermediate', 'advanced', 'expert', 'master'];

// Required tip keys based on ScientificTipsCarousel.tsx TIPS array
const REQUIRED_TIPS = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5'];

interface TranslationFile {
  brain?: {
    tiers?: Record<string, string>;
    tips?: Record<string, string>;
  };
}

const languages: { name: string; translations: TranslationFile }[] = [
  { name: 'en', translations: en },
  { name: 'he', translations: he },
  { name: 'sv', translations: sv },
  { name: 'ja', translations: ja },
  { name: 'es', translations: es },
];

describe('Brain translation keys', () => {
  describe('brain.tiers', () => {
    languages.forEach(({ name, translations }) => {
      it(`${name}.js should have all tier translations`, () => {
        expect(translations.brain).toBeDefined();
        expect(translations.brain?.tiers).toBeDefined();

        REQUIRED_TIERS.forEach((tier) => {
          expect(translations.brain?.tiers?.[tier]).toBeDefined();
          expect(typeof translations.brain?.tiers?.[tier]).toBe('string');
          expect(translations.brain?.tiers?.[tier]?.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('brain.tips', () => {
    languages.forEach(({ name, translations }) => {
      it(`${name}.js should have all tip translations`, () => {
        expect(translations.brain).toBeDefined();
        expect(translations.brain?.tips).toBeDefined();

        REQUIRED_TIPS.forEach((tip) => {
          expect(translations.brain?.tips?.[tip]).toBeDefined();
          expect(typeof translations.brain?.tips?.[tip]).toBe('string');
          expect(translations.brain?.tips?.[tip]?.length).toBeGreaterThan(0);
        });
      });
    });
  });
});

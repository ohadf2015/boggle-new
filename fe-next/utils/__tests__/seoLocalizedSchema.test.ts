/**
 * Localized JSON-LD schema strings. Drives per-locale HowTo and Event schemas
 * in the root layout. Missing SV/JA/ES content suppresses rich-result
 * eligibility for those markets (near-zero non-Hebrew/English acquisition).
 */

import { getLocalizedSchemaStrings } from '../seoLocalizedSchema';

describe('getLocalizedSchemaStrings', () => {
  const locales = ['he', 'en', 'sv', 'ja', 'es'] as const;

  it.each(locales)('returns HowTo and DailyChallenge strings for %s', (locale) => {
    const s = getLocalizedSchemaStrings(locale);
    expect(s.howToName).toBeTruthy();
    expect(s.howToDescription).toBeTruthy();
    expect(s.steps).toHaveLength(4);
    s.steps.forEach((step) => {
      expect(step.name).toBeTruthy();
      expect(step.text).toBeTruthy();
    });
    expect(s.dailyEventName).toBeTruthy();
    expect(s.dailyEventDescription).toBeTruthy();
  });

  it('falls back to english for unknown locale', () => {
    const s = getLocalizedSchemaStrings('fr' as never);
    const en = getLocalizedSchemaStrings('en');
    expect(s.howToName).toBe(en.howToName);
  });

  it('hebrew uses RTL-appropriate text', () => {
    const s = getLocalizedSchemaStrings('he');
    expect(s.howToName).toMatch(/[֐-׿]/);
  });

  it('japanese uses CJK characters', () => {
    const s = getLocalizedSchemaStrings('ja');
    expect(s.howToName).toMatch(/[぀-ヿ一-鿿]/);
  });

  it('swedish and spanish differ from english', () => {
    const en = getLocalizedSchemaStrings('en');
    const sv = getLocalizedSchemaStrings('sv');
    const es = getLocalizedSchemaStrings('es');
    expect(sv.howToName).not.toBe(en.howToName);
    expect(es.howToName).not.toBe(en.howToName);
  });
});

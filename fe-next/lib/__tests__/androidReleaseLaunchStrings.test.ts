import { describe, it, expect } from 'vitest';
import { RELEASE_STRINGS, getReleaseStrings } from '@/emails/androidReleaseLaunch.strings';

const LANGS = ['en', 'he', 'sv', 'ja', 'es'] as const;

describe('androidReleaseLaunch strings — review ask', () => {
  it('every language has a non-empty rateAsk so the blast doubles as a review-seeder', () => {
    for (const lang of LANGS) {
      const s = getReleaseStrings(lang);
      expect(s.rateAsk, `${lang} rateAsk`).toBeTruthy();
      expect(s.rateAsk.trim().length, `${lang} rateAsk non-empty`).toBeGreaterThan(0);
    }
  });

  it('rateAsk carries the star signal in every language', () => {
    for (const lang of LANGS) {
      expect(RELEASE_STRINGS[lang].rateAsk, `${lang}`).toContain('⭐');
    }
  });
});

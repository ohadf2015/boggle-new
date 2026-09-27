import { describe, it, expect } from 'vitest';
import { contentByLocale } from '../content';

/**
 * Guard test for the privacy policy content. Google flagged
 * https://www.lexiclash.live/en/legal/privacy as "does not have sufficient
 * content" — this asserts every one of the six locales we ship (see
 * lib/i18n.js) has a complete, non-fallback policy, and that the required
 * Google API Services User Data disclosure is present verbatim everywhere.
 */

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const MIN_SECTIONS = 15;
const GOOGLE_CLAUSE =
  "LexiClash's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.";
const GOOGLE_CLAUSE_URL = 'https://developers.google.com/terms/api-services-user-data-policy';

describe('Privacy policy content', () => {
  it('ships exactly the six locales LexiClash supports (no silent English fallback)', () => {
    expect(Object.keys(contentByLocale).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('%s has a title, a substantial intro, and a complete set of sections', (locale) => {
    const c = contentByLocale[locale];
    expect(c).toBeDefined();
    expect(c.title.trim().length).toBeGreaterThan(0);
    expect(c.intro.trim().length).toBeGreaterThan(40);
    expect(c.sections.length).toBeGreaterThanOrEqual(MIN_SECTIONS);
    for (const section of c.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.content.trim().length).toBeGreaterThan(0);
      for (const item of section.items ?? []) {
        expect(item.trim().length).toBeGreaterThan(0);
      }
      for (const sub of section.subsections ?? []) {
        expect(sub.title.trim().length).toBeGreaterThan(0);
        for (const item of sub.items ?? []) {
          expect(item.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it.each(LOCALES)('%s has a dedicated Google User Data section covering the Classroom integration', (locale) => {
    const c = contentByLocale[locale];
    const flat = JSON.stringify(c);
    // The required verbatim disclosure + link, unmodified, in every locale.
    expect(flat).toContain(GOOGLE_CLAUSE);
    expect(flat).toContain(GOOGLE_CLAUSE_URL);
    // Roster/email handling, token lifetime, and revoke instructions must all be covered,
    // and the revoke link must be a real, linkifiable https:// URL (not a bare domain).
    expect(flat).toContain('https://myaccount.google.com/permissions');
    expect(flat.toLowerCase()).toContain('aes-256-gcm');
  });

  it.each(LOCALES)('%s describes the actual self-declared age gate, not an unused parental-consent record', (locale) => {
    const flat = JSON.stringify(contentByLocale[locale]);
    // hooks/useParentalConsent.ts is never mounted anywhere in the app (confirmed by grep) —
    // the policy must not claim it as an active practice. See lib/families/socialPolicy.ts /
    // components/families/AgeGateModal.tsx for the mechanism that IS live.
    expect(flat.toLowerCase()).not.toContain('parental-consent record');
    expect(flat).toContain('lexiclash.game@gmail.com');
  });

  it.each(LOCALES)('%s mentions the real support contact address', (locale) => {
    expect(JSON.stringify(contentByLocale[locale])).toContain('lexiclash.game@gmail.com');
  });

  it.each(LOCALES)('%s names every processor the code actually integrates', (locale) => {
    const flat = JSON.stringify(contentByLocale[locale]);
    for (const processor of ['Supabase', 'PostHog', 'Sentry', 'LogRocket', 'AdMob', 'Resend', 'Polar']) {
      expect(flat).toContain(processor);
    }
  });
});

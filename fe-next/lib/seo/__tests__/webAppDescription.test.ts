import { getWebAppDescription } from '../webAppDescription';
import { seoContent } from '@/app/[locale]/(home)/seoContent';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

// Japanese has no spaces between words, so count characters there instead.
const wordCount = (text: string) => text.trim().split(/\s+/).length;

describe('getWebAppDescription (sitewide WebApplication/VideoGame JSON-LD)', () => {
  it.each(LOCALES)('given %s, when read, then it is the visible homepage About copy + first FAQ answer', (locale) => {
    const { description, faq } = seoContent[locale];
    expect(getWebAppDescription(locale)).toBe(`${description} ${faq[0].answer}`);
  });

  it.each(LOCALES.filter((l) => l !== 'ja'))(
    'given %s, when read, then it has at least 50 words for AI answers to quote',
    (locale) => {
      expect(wordCount(getWebAppDescription(locale))).toBeGreaterThanOrEqual(50);
    }
  );

  it('given ja, when read, then it is a long passage, not the short meta description', () => {
    expect(getWebAppDescription('ja').length).toBeGreaterThanOrEqual(100);
  });

  it('given an unknown locale, when read, then it falls back to English', () => {
    expect(getWebAppDescription('xx')).toBe(getWebAppDescription('en'));
  });
});

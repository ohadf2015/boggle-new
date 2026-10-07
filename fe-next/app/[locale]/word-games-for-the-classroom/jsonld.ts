import type { LocaleContent } from './content';

export const CLASSROOM_WORD_GAMES_BASE = 'https://www.lexiclash.live';
export const CLASSROOM_WORD_GAMES_PATH = '/word-games-for-the-classroom';

const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export function classroomWordGamesPageUrl(locale: string): string {
  const lang = SUPPORTED.has(locale) ? locale : 'en';
  return `${CLASSROOM_WORD_GAMES_BASE}/${lang}${CLASSROOM_WORD_GAMES_PATH}`;
}

/**
 * JSON-LD for the classroom word-games landing.
 * Must be emitted with the inline JsonLd helper (not next/script) so crawlers
 * that only read the initial HTML see FAQPage.
 */
export function buildClassroomWordGamesJsonLd(locale: string, c: LocaleContent) {
  const lang = SUPPORTED.has(locale) ? locale : 'en';
  const pageUrl = classroomWordGamesPageUrl(locale);

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#page`,
    name: c.metaTitle,
    description: c.metaDescription,
    url: pageUrl,
    inLanguage: lang,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-answer]'],
    },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    inLanguage: lang,
    url: pageUrl,
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLASSROOM_WORD_GAMES_BASE}/${lang}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${CLASSROOM_WORD_GAMES_BASE}/${lang}/education` },
      { '@type': 'ListItem', position: 3, name: c.metaTitle, item: pageUrl },
    ],
  };

  return { webPage, faqPage, breadcrumb };
}

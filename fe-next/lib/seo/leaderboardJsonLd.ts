const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es']);

interface FaqItem {
  question: string;
  answer: string;
}

function safeLocale(locale: string): string {
  return SUPPORTED.has(locale) ? locale : 'en';
}

export function buildLeaderboardFaqJsonLd(locale: string, faq: FaqItem[]) {
  if (!faq || faq.length === 0) return null;
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage' as const,
    '@id': `${BASE_URL}/${lang}/leaderboard#faq`,
    inLanguage: lang,
    mainEntity: faq.map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.answer,
      },
    })),
  };
}

const LINE_SEP = new RegExp(String.fromCharCode(0x2028), 'g');
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), 'g');

export function encodeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029');
}

import type { WordEntry, Locale } from './content';
import { formatLongDate } from './formatDate';

const SITE_URL = 'https://www.lexiclash.live';

const wotdLabel: Record<Locale, string> = {
  en: 'Word of the Day',
  he: 'מילת היום',
  sv: 'Dagens Ord',
  ja: '今日の言葉',
  es: 'Palabra del Día',
};

const homeLabel: Record<Locale, string> = {
  en: 'Home',
  he: 'דף הבית',
  sv: 'Hem',
  ja: 'ホーム',
  es: 'Inicio',
};

function loc(locale: string): Locale {
  return (['en', 'he', 'sv', 'ja', 'es'] as const).includes(locale as Locale)
    ? (locale as Locale)
    : 'en';
}

export function buildDynamicTitle(locale: string, word: WordEntry): string {
  const l = loc(locale);
  const dateStr = formatLongDate(l, word.dateKey);
  return `${wotdLabel[l]}: ${word.word} — ${dateStr} | LexiClash`;
}

export function buildDynamicDescription(locale: string, word: WordEntry): string {
  const l = loc(locale);
  const definition = word.definition.length > 140
    ? word.definition.slice(0, 137) + '…'
    : word.definition;
  return `${wotdLabel[l]}: ${word.word}. ${definition}`;
}

export function buildSchemas(locale: string, word: WordEntry, urlPath: string) {
  const l = loc(locale);
  const url = `${SITE_URL}${urlPath}`;
  const langTag = l === 'en' ? 'en-US' : `${l}-${l === 'he' ? 'IL' : l === 'sv' ? 'SE' : l === 'ja' ? 'JP' : 'ES'}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel[l], item: `${SITE_URL}/${l}` },
        { '@type': 'ListItem', position: 2, name: wotdLabel[l], item: `${SITE_URL}/${l}/word-of-the-day` },
        { '@type': 'ListItem', position: 3, name: word.word, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: word.word,
      description: word.definition,
      inLanguage: langTag,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: `LexiClash ${wotdLabel[l]}`,
        url: `${SITE_URL}/${l}/word-of-the-day`,
      },
      termCode: word.dateKey,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${wotdLabel[l]}: ${word.word}`,
      datePublished: `${word.dateKey}T00:00:00Z`,
      dateModified: `${word.dateKey}T00:00:00Z`,
      inLanguage: langTag,
      author: { '@type': 'Organization', name: 'LexiClash' },
      publisher: {
        '@type': 'Organization',
        name: 'LexiClash',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      about: {
        '@type': 'DefinedTerm',
        name: word.word,
        description: word.definition,
        inLanguage: langTag,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: buildDynamicTitle(l, word),
      description: buildDynamicDescription(l, word),
      inLanguage: langTag,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['[data-speakable="true"]'],
      },
    },
  ];
}

export const SITE_URL_CONST = SITE_URL;

import { getCatalog } from './catalog';
import { LISTS_PATH, absoluteUrl, gradeHubPath, langHubPath, pickLocale, topicHubPath } from './paths';
import { gradeLabel, langName, topicLabel, tr, wordsIn } from './i18n';

const LOCALES = new Set(['en', 'he', 'es', 'sv', 'ja']);

/** The word-list library as an llms.txt section, every URL in the locale that serves it. */
export function wordListLlmsSection(locale: string): string {
  if (!LOCALES.has(locale)) return '';
  const c = getCatalog();
  const words = c.lists.reduce((n, l) => n + l.words.length, 0);
  const url = (locales: readonly string[], path: string) => absoluteUrl(pickLocale(locales as never, locale), path);
  const lines = [
    `## ${tr(locale, 'nav.lists')}`,
    '',
    tr(locale, 'hub.intro', { lists: c.lists.length, words, languages: c.langHubs.length }),
    '',
    `- ${tr(locale, 'hub.h1')}: ${absoluteUrl(locale, LISTS_PATH)}`,
    ...c.langHubs.map((h) => `- ${tr(locale, `hub.langTitle.${h.lang}`)}: ${url(h.locales, langHubPath(h.lang))}`),
    ...c.gradeHubs.map(
      (h) =>
        `- ${tr(locale, 'hub.gradeTitle', { grade: gradeLabel(locale, h.grade), language: langName(locale, h.lang), wordsIn: wordsIn(locale, h.lang) })}: ${url(h.locales, gradeHubPath(h.lang, h.grade))}`,
    ),
    ...c.topicHubs.map((h) => `- ${tr(locale, 'hub.topicTitle', { topic: topicLabel(locale, h.topic) })}: ${url(h.locales, topicHubPath(h.topic))}`),
  ];
  return `\n${lines.join('\n')}\n`;
}

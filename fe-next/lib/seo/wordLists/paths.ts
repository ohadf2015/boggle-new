import { HREFLANG_BASE_URL } from '@/lib/seo/hreflang';
import type { ListLang, PageLocale, WordList } from './model';
import type { TopicId } from './topics';

export const LISTS_PATH = '/education/lists';

export const LANG_SEGMENT: Record<ListLang, string> = {
  en: 'english',
  he: 'hebrew',
  es: 'spanish',
  sv: 'swedish',
  ja: 'japanese',
};

const HUB_LOCALES: readonly PageLocale[] = ['en', 'he', 'es', 'sv', 'ja', 'ru'];
/** English lists are what EFL teachers in every market search for. */
export const EFL_LOCALES: readonly PageLocale[] = ['en', 'he', 'es', 'sv', 'ja'];

export function hubLocales(): PageLocale[] {
  return [...HUB_LOCALES];
}

export function isPageLocale(value: string): value is PageLocale {
  return (HUB_LOCALES as readonly string[]).includes(value);
}

export function langFromSegment(segment: string): ListLang | null {
  const hit = (Object.entries(LANG_SEGMENT) as Array<[ListLang, string]>).find(([, s]) => s === segment);
  return hit ? hit[0] : null;
}

export const listPath = (l: Pick<WordList, 'lang' | 'slug'>) => `${LISTS_PATH}/${LANG_SEGMENT[l.lang]}/${l.slug}`;
export const langHubPath = (lang: ListLang) => `${LISTS_PATH}/${LANG_SEGMENT[lang]}`;
export const gradeHubPath = (lang: ListLang, grade: number) => `${LISTS_PATH}/${LANG_SEGMENT[lang]}/grade-${grade}`;
export const topicHubPath = (topic: TopicId) => `${LISTS_PATH}/topic/${topic}`;

export const absoluteUrl = (locale: string, path: string) => `${HREFLANG_BASE_URL}/${locale}${path}`;

/** The locale to link a reader on `current` to: theirs when the page exists, else the primary. */
export function pickLocale(locales: readonly PageLocale[], current: string): PageLocale {
  return (locales as readonly string[]).includes(current) ? (current as PageLocale) : locales[0];
}

/**
 * The one hreflang map for a word-list URL, shared by the page head and the sitemap
 * so the two can never disagree. x-default is the primary (first) locale.
 */
export function clusterAlternates(path: string, locales: readonly PageLocale[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = absoluteUrl(l, path);
  out['x-default'] = absoluteUrl(locales[0], path);
  return out;
}

export function unionLocales(lists: ReadonlyArray<Pick<WordList, 'locales'>>): PageLocale[] {
  const order: PageLocale[] = ['en', 'he', 'es', 'sv', 'ja'];
  const seen = new Set(lists.flatMap((l) => l.locales));
  return order.filter((l) => seen.has(l));
}

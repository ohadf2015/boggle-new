import { LANG_SEGMENT, langFromSegment } from '@/lib/seo/wordLists/paths';
import { playableWord, type ListLang, type WordList } from '@/lib/seo/wordLists/model';
import { findList } from '@/lib/seo/wordLists/catalog';

export const PUBLIC_LIST_PARAM = 'publicList';

export const publicListId = (list: Pick<WordList, 'lang' | 'slug'>) => `${LANG_SEGMENT[list.lang]}/${list.slug}`;

export function parsePublicListId(raw: string | null | undefined): { segment: string; slug: string } | null {
  const m = /^([a-z]+)\/([a-z0-9][a-z0-9-]*)$/.exec(raw ?? '');
  if (!m || !langFromSegment(m[1])) return null;
  return { segment: m[1], slug: m[2] };
}

export function teacherSignupHref(locale: string, list: Pick<WordList, 'lang' | 'slug'>): string {
  const target = `/${locale}/teacher/classroom/new?${PUBLIC_LIST_PARAM}=${encodeURIComponent(publicListId(list))}`;
  return `/${locale}/education/access?from=${encodeURIComponent(target)}`;
}

/** Server-only: the catalog is large. */
export function resolvePublicList(raw: string | null | undefined): { title: string; language: ListLang; words: string[] } | null {
  const id = parsePublicListId(raw);
  const list = id && findList(id.segment, id.slug);
  if (!list) return null;
  return { title: list.name.raw, language: list.lang, words: list.words.map((w) => playableWord(w.word)) };
}

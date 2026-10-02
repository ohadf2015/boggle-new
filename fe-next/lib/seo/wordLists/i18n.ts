import { translateKey } from '@/lib/i18n/serverTranslate';
import { stripGradePrefix, type ListLang, type WordList } from './model';
import type { TopicId } from './topics';

type Vars = Record<string, string | number>;

/** Server-side `t()` for the eg2Seo namespace, with `{var}` interpolation. */
export function tr(locale: string, key: string, vars: Vars = {}): string {
  const raw = translateKey(`eg2Seo.${key}`, locale);
  const fmt = (v: string | number) => (typeof v === 'number' ? new Intl.NumberFormat(locale).format(v) : v);
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? fmt(vars[name]) : m));
}

/** Hebrew school grades are lettered, not numbered: א׳ … י״ב. */
const HEBREW_GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב'];

export function gradeLabel(locale: string, grade: number): string {
  const n = locale === 'he' ? (HEBREW_GRADES[grade - 1] ?? String(grade)) : grade;
  return tr(locale, 'grade', { n });
}

export const topicLabel = (locale: string, topic: TopicId) => tr(locale, `topic.${topic}`);
export const langName = (locale: string, lang: ListLang) => tr(locale, `lang.${lang}`);
export const wordsIn = (locale: string, lang: ListLang) => tr(locale, `wordsIn.${lang}`);

/**
 * The list's name as a reader of `locale` should see it: the half of a bilingual
 * name written in their language when there is one, else a name built from the
 * list's language and topic, with the original kept as the subtitle.
 */
export function displayTitle(list: WordList, locale: string): { title: string; subtitle: string } {
  const latin = stripGradePrefix(list.name.latin);
  const hebrew = stripGradePrefix(list.name.hebrew);
  const original = stripGradePrefix(list.name.raw);
  if (locale === 'he' && hebrew) return { title: hebrew, subtitle: latin };
  if (locale === 'he' && list.lang === 'en' && latin) return { title: latin, subtitle: '' };
  if (locale === list.lang && locale !== 'he' && latin) return { title: latin, subtitle: hebrew };
  if (locale === 'en' && list.lang === 'en' && latin) return { title: latin, subtitle: hebrew };
  const built = `${tr(locale, `vocab.${list.lang}`)}: ${topicLabel(locale, list.topic)}`;
  return { title: built, subtitle: original };
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs']);

/** English titles are cased as titles; other locales keep their own casing rules. */
export function titleCase(locale: string, text: string): string {
  if (locale !== 'en') return text;
  let afterBreak = true;
  return text
    .split(' ')
    .map((word) => {
      const lead = afterBreak || !SMALL_WORDS.has(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
      afterBreak = /[:–—-]$/.test(word);
      return lead;
    })
    .join(' ');
}

/** The list's own name for a title: never the built "language: topic" fallback, which repeats both. */
export function metaName(list: WordList, locale: string): string {
  const { title } = displayTitle(list, locale);
  const built = `${tr(locale, `vocab.${list.lang}`)}: ${topicLabel(locale, list.topic)}`;
  const labelOnly = !list.name.latin && list.lang !== 'he';
  const name = title === built || labelOnly ? topicLabel(locale, list.topic) : title;
  return name.replace(/\s*[:：]\s*/g, ' - ');
}

const HEBREW_SCRIPT = /[֐-׿]/;
const LATIN_SCRIPT = /[A-Za-z]/;

/** The languages the visible glosses are written in. A Latin gloss is the list's own language for Spanish and Swedish lists, English otherwise. */
export function glossLanguages(list: WordList): ListLang[] {
  const share = (re: RegExp) => list.words.filter((w) => re.test(w.definition)).length / list.words.length;
  const out: ListLang[] = [];
  if (share(HEBREW_SCRIPT) >= 0.5) out.push('he');
  if (share(LATIN_SCRIPT) >= 0.5) out.push(list.lang === 'es' || list.lang === 'sv' ? list.lang : 'en');
  return out;
}

/** "definitions" only when the glosses read in the page's language; otherwise say what they are, or null when there are none. */
export function glossPhrase(list: WordList, locale: string): string | null {
  const langs = glossLanguages(list);
  if (langs.length === 0) return null;
  if ((langs as string[]).includes(locale)) return tr(locale, 'gloss.definitions');
  return tr(locale, `gloss.${langs[0] === list.lang ? 'definitionsIn' : 'translations'}.${langs[0]}`);
}

export function sampleWords(list: WordList, count = 4): string {
  return list.words
    .slice(0, count)
    .map((w) => w.word)
    .join(', ');
}

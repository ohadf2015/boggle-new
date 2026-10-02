import snapshot from './wordLists.generated.json';
import { buildLists, type ListLang, type PageLocale, type Snapshot, type WordList } from './model';
import { isTopicId, type TopicId } from './topics';
import { EFL_LOCALES, langFromSegment, unionLocales } from './paths';

/** Snapshot date, as an ISO timestamp for sitemap lastmod. */
export const WORD_LISTS_GENERATED_AT = `${(snapshot as Snapshot).generatedAt}T00:00:00.000Z`;
export const MIN_GRADE_HUB_LISTS = 2;
export const MIN_TOPIC_HUB_LISTS = 3;
const RELATED_COUNT = 6;

export interface GradeHub {
  lang: ListLang;
  grade: number;
  lists: WordList[];
  locales: PageLocale[];
}

export interface TopicHub {
  topic: TopicId;
  lists: WordList[];
  locales: PageLocale[];
}

export interface LangHub {
  lang: ListLang;
  lists: WordList[];
  grades: GradeHub[];
  locales: PageLocale[];
}

export interface Catalog {
  generatedAt: string;
  lists: WordList[];
  langHubs: LangHub[];
  gradeHubs: GradeHub[];
  topicHubs: TopicHub[];
}

let cached: Catalog | null = null;

/** A hub that holds English lists is an EFL page, so every EFL market gets it in its own language. */
function hubLocalesFor(members: WordList[]): PageLocale[] {
  return members.some((l) => l.lang === 'en') ? [...EFL_LOCALES] : unionLocales(members);
}

function groupBy<K>(lists: WordList[], key: (l: WordList) => K | null): Map<K, WordList[]> {
  const out = new Map<K, WordList[]>();
  for (const l of lists) {
    const k = key(l);
    if (k === null) continue;
    out.set(k, [...(out.get(k) ?? []), l]);
  }
  return out;
}

export function getCatalog(): Catalog {
  if (cached) return cached;
  const lists = buildLists(snapshot as Snapshot);

  const gradeHubs: GradeHub[] = [];
  for (const [k, members] of groupBy(lists, (l) => (l.grade ? `${l.lang}:${l.grade}` : null))) {
    if (members.length < MIN_GRADE_HUB_LISTS) continue;
    const [lang, grade] = k.split(':');
    gradeHubs.push({ lang: lang as ListLang, grade: Number(grade), lists: members, locales: hubLocalesFor(members) });
  }
  gradeHubs.sort((a, b) => a.lang.localeCompare(b.lang) || a.grade - b.grade);

  const topicHubs: TopicHub[] = [];
  for (const [topic, members] of groupBy(lists, (l) => l.topic)) {
    if (members.length < MIN_TOPIC_HUB_LISTS) continue;
    topicHubs.push({ topic, lists: members, locales: hubLocalesFor(members) });
  }
  topicHubs.sort((a, b) => b.lists.length - a.lists.length || a.topic.localeCompare(b.topic));

  const langHubs: LangHub[] = [...groupBy(lists, (l) => l.lang)].map(([lang, members]) => ({
    lang,
    lists: members,
    grades: gradeHubs.filter((g) => g.lang === lang),
    locales: hubLocalesFor(members),
  }));

  cached = { generatedAt: (snapshot as Snapshot).generatedAt, lists, langHubs, gradeHubs, topicHubs };
  return cached;
}

export function findLangHub(segment: string): LangHub | null {
  const lang = langFromSegment(segment);
  return getCatalog().langHubs.find((h) => h.lang === lang) ?? null;
}

export function findList(segment: string, slug: string): WordList | null {
  const lang = langFromSegment(segment);
  return getCatalog().lists.find((l) => l.lang === lang && l.slug === slug) ?? null;
}

export function findGradeHub(segment: string, item: string): GradeHub | null {
  const lang = langFromSegment(segment);
  const grade = Number(/^grade-(\d{1,2})$/.exec(item)?.[1]);
  return getCatalog().gradeHubs.find((h) => h.lang === lang && h.grade === grade) ?? null;
}

export function findTopicHub(topic: string): TopicHub | null {
  if (!isTopicId(topic)) return null;
  return getCatalog().topicHubs.find((h) => h.topic === topic) ?? null;
}

/** Same grade and language first, then the same topic nearby, then the rest of the language. */
export function relatedLists(list: WordList, count = RELATED_COUNT): WordList[] {
  const distance = (l: WordList) => Math.abs((l.grade ?? 0) - (list.grade ?? 0));
  const score = (l: WordList) =>
    (l.lang === list.lang && l.grade === list.grade ? 0 : 100) +
    (l.topic === list.topic ? 0 : 50) +
    (l.lang === list.lang ? 0 : 30) +
    distance(l);
  return getCatalog()
    .lists.filter((l) => l.id !== list.id)
    .map((l) => ({ l, s: score(l) }))
    .sort((a, b) => a.s - b.s || a.l.slug.localeCompare(b.l.slug))
    .slice(0, count)
    .map((x) => x.l);
}

/**
 * The page model for public word lists: which snapshot rows become pages, in which
 * locales, under which URL. Pure functions over `wordLists.generated.json`.
 */
import { classifyTopic, type TopicId } from './topics';

export const MIN_WORDS = 10;
/** Share of the smaller list's words that makes two lists the same list. */
const DUPLICATE_OVERLAP = 0.8;

export type ListLang = 'en' | 'he' | 'es' | 'sv' | 'ja';
export type PageLocale = 'en' | 'he' | 'es' | 'sv' | 'ja' | 'ru';

export interface SnapshotList {
  id: string;
  origin: 'curriculum' | 'teacher';
  name: string;
  description: string;
  language: string;
  grade: number | null;
  subject: string;
  author?: string;
  words: Array<{ w: string; d: string }>;
}

export interface Snapshot {
  generatedAt: string;
  lists: SnapshotList[];
}

export interface WordEntry {
  word: string;
  definition: string;
}

export interface WordList {
  id: string;
  slug: string;
  origin: SnapshotList['origin'];
  author?: string;
  lang: ListLang;
  grade: number | null;
  subject: string;
  topic: TopicId;
  description: string;
  name: { latin: string; hebrew: string; raw: string };
  words: WordEntry[];
  /** Page locales that render this list, primary (word language) first. */
  locales: PageLocale[];
}

const HEBREW = /[֐-׿]/;
const NIQQUD = /[֑-ׇ]/g;
const LATIN = /[A-Za-z]/;

export function playableWord(word: string): string {
  return word.replace(NIQQUD, '');
}

const wordKey = (word: string) => playableWord(word).trim().toLowerCase();

export function cleanWords(words: SnapshotList['words']): WordEntry[] {
  const seen = new Set<string>();
  const out: WordEntry[] = [];
  for (const { w, d } of words) {
    const word = (w ?? '').trim();
    if (!word) continue;
    const key = wordKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, definition: (d ?? '').trim() });
  }
  return out;
}

const share = (words: WordEntry[], test: (w: WordEntry) => boolean) =>
  words.length === 0 ? 0 : words.filter(test).length / words.length;

export function detectLang(column: string, words: WordEntry[]): ListLang {
  if (share(words, (w) => HEBREW.test(w.word)) >= 0.5) return 'he';
  if (column === 'he') return 'en';
  return (['en', 'es', 'sv', 'ja'] as const).find((l) => l === column) ?? 'en';
}

export function localesFor(lang: ListLang, words: WordEntry[]): PageLocale[] {
  const out: PageLocale[] = [lang];
  if (lang !== 'he' && share(words, (w) => HEBREW.test(w.definition)) >= 0.5) out.push('he');
  if (lang === 'he' && share(words, (w) => LATIN.test(w.definition)) >= 0.5) out.push('en');
  if (lang === 'es' || lang === 'sv' || lang === 'ja') out.push('en');
  return [...new Set(out)];
}

export function splitName(name: string): { latin: string; hebrew: string } {
  const tidy = (s: string) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-—:|]+|[\s\-—:|]+$/g, '')
      .trim();
  const firstHebrew = name.search(HEBREW);
  if (firstHebrew < 0) return { latin: tidy(name), hebrew: '' };
  const before = name.slice(0, firstHebrew);
  if (!LATIN.test(before)) return { latin: '', hebrew: tidy(name) };
  return { latin: tidy(before), hebrew: tidy(name.slice(firstHebrew)) };
}

export function stripGradePrefix(name: string): string {
  return name
    .replace(/^\s*(grade|grado)\s*\d+\s*[-—:]\s*/i, '')
    .replace(/^\s*כיתה\s+\S+\s*[-—:]\s*/, '')
    .replace(/^\s*אוצר מילים\s*[-—:]\s*/, '')
    .trim();
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function readableSlug(lang: ListLang, latin: string, topic: TopicId, grade: number | null): string {
  const base = (lang === 'en' || lang === 'es') && latin ? slugify(stripGradePrefix(latin)) : '';
  const gradePart = grade ? `grade-${grade}` : '';
  return [base || topic, gradePart].filter(Boolean).join('-');
}

function dropNearDuplicates(lists: WordList[]): WordList[] {
  const keys = new Map(lists.map((l) => [l.id, new Set(l.words.map((w) => wordKey(w.word)))]));
  const dropped = new Set<string>();
  const bySize = [...lists].sort((a, b) => b.words.length - a.words.length || a.id.localeCompare(b.id));
  for (let i = 0; i < bySize.length; i += 1) {
    const keep = bySize[i];
    if (dropped.has(keep.id)) continue;
    const keepKeys = keys.get(keep.id)!;
    for (const other of bySize.slice(i + 1)) {
      if (dropped.has(other.id) || other.lang !== keep.lang) continue;
      const otherKeys = keys.get(other.id)!;
      let overlap = 0;
      for (const k of otherKeys) if (keepKeys.has(k)) overlap += 1;
      if (overlap / Math.min(otherKeys.size, keepKeys.size) >= DUPLICATE_OVERLAP) dropped.add(other.id);
    }
  }
  return lists.filter((l) => !dropped.has(l.id));
}

export function buildLists(snapshot: Snapshot): WordList[] {
  const built: WordList[] = [];
  for (const row of snapshot.lists) {
    const words = cleanWords(row.words);
    if (words.length < MIN_WORDS) continue;
    const lang = detectLang(row.language, words);
    const parts = splitName(row.name);
    const topic = classifyTopic(row.name, row.description, row.subject);
    const idPart = row.id
      .replace(/[^a-f0-9]/gi, '')
      .slice(0, 6)
      .toLowerCase();
    built.push({
      id: row.id,
      slug: `${readableSlug(lang, parts.latin, topic, row.grade)}-${idPart}`,
      origin: row.origin,
      author: row.author,
      lang,
      grade: row.grade,
      subject: row.subject,
      topic,
      description: row.description,
      name: { ...parts, raw: row.name },
      words,
      locales: localesFor(lang, words),
    });
  }
  return dropNearDuplicates(built).sort(
    (a, b) => a.lang.localeCompare(b.lang) || (a.grade ?? 99) - (b.grade ?? 99) || a.slug.localeCompare(b.slug),
  );
}

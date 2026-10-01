import { EDUCATION_LANGUAGES, normalizeForStorage, type Language, type VocabularyWord } from '@/lib/supabase/education/types';
import { checkWordIntegration } from '@/hooks/wordIntegrationLogic';
import { isBlockedWord } from '@/lib/wordTowerV2/blocked';

export interface WordEntry {
  word: string;
  definition?: string;
}

export const MAX_WORD_LENGTH = 30;
export const MAX_LIST_WORDS = 200;

const DEFINITION_LINE = /^(.+?)(?:\t|\s+[-–—=]\s+|\s*:\s+)(.+)$/;
const LIST_SEPARATORS = /[,;|·•、，；\t]+/;
const LEADING_MARKER = /^\s*(?:\d{1,3}[.)]\s+|[-–—•*]\s+)/;

function clean(text: string): string {
  return text.replace(LEADING_MARKER, '').replace(/\s+/g, ' ').trim();
}

export function parseWordPaste(text: string): WordEntry[] {
  const entries: WordEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(LEADING_MARKER, '').trim();
    if (!line) continue;
    const pair = DEFINITION_LINE.exec(line);
    if (pair && !LIST_SEPARATORS.test(pair[1])) {
      const word = clean(pair[1]);
      const definition = pair[2].trim();
      if (word) entries.push(definition ? { word, definition } : { word });
      continue;
    }
    for (const part of line.split(LIST_SEPARATORS)) {
      const word = clean(part);
      if (word) entries.push({ word });
    }
  }
  return entries;
}

function splitCsvRow(row: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (quoted) {
      if (ch === '"' && row[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

const HEADER_WORDS = new Set(['word', 'words', 'term', 'מילה', 'palabra', 'ord', '単語', 'слово']);

export function parseWordTable(text: string): WordEntry[] {
  const rows = text.split(/\r?\n/).filter((r) => r.trim());
  if (rows.length === 0) return [];
  const delimiter = rows[0].includes('\t') ? '\t' : rows[0].includes(';') && !rows[0].includes(',') ? ';' : ',';
  const parsed = rows.map((r) => splitCsvRow(r, delimiter));
  const body = HEADER_WORDS.has((parsed[0][0] ?? '').toLowerCase()) ? parsed.slice(1) : parsed;
  const entries: WordEntry[] = [];
  for (const [first, second] of body) {
    const word = clean(first ?? '');
    if (!word) continue;
    entries.push(second ? { word, definition: second } : { word });
  }
  return entries;
}

export function mergeWords(
  existing: VocabularyWord[],
  incoming: WordEntry[],
  language: Language,
): { words: VocabularyWord[]; added: number; duplicates: number } {
  const seen = new Set(existing.map((w) => normalizeForStorage(w.word, language)));
  const words = [...existing];
  let added = 0;
  let duplicates = 0;
  for (const entry of incoming) {
    const key = normalizeForStorage(entry.word, language);
    if (!key || seen.has(key)) { duplicates++; continue; }
    if (words.length >= MAX_LIST_WORDS) break;
    seen.add(key);
    const result = checkWordIntegration(entry.word, language);
    words.push({
      word: entry.word.trim(),
      canIntegrate: result.canIntegrate,
      ...(entry.definition ? { definition: entry.definition } : {}),
    });
    added++;
  }
  return { words, added, duplicates };
}

export type WordIssue = 'digits' | 'tooLong' | 'wrongScript' | 'blocked';

const SCRIPT: Record<Language, RegExp> = {
  en: /^[a-z' -]+$/i,
  es: /^[a-záéíóúüñ' -]+$/i,
  sv: /^[a-zåäöéü' -]+$/i,
  he: /^[א-ת֑-ׇ'"׳״ -]+$/,
  ru: /^[Ѐ-ӿ' -]+$/,
  ja: /^[぀-ヿ一-鿿㐀-䶿ｦ-ﾟー ]+$/,
};

export function wordIssue(word: string, language: Language): WordIssue | null {
  const w = word.trim();
  if (/\d/.test(w)) return 'digits';
  if (w.length > MAX_WORD_LENGTH) return 'tooLong';
  if (w.split(/\s+/).some(isBlockedWord)) return 'blocked';
  const script = SCRIPT[language];
  if (script && !script.test(w)) return 'wrongScript';
  return null;
}

export type GradeBand = 'k2' | 'g35' | 'g68' | 'g912';
export const GRADE_BANDS: readonly GradeBand[] = ['k2', 'g35', 'g68', 'g912'];

export function gradeLevelToBand(gradeLevel: string | null | undefined): GradeBand | null {
  const n = Number(/^grade_(\d{1,2})$/.exec(gradeLevel ?? '')?.[1]);
  if (!n) return null;
  if (n <= 2) return 'k2';
  if (n <= 5) return 'g35';
  if (n <= 8) return 'g68';
  return 'g912';
}

export const LIBRARY_TOPICS = ['general', 'english', 'hebrew', 'science', 'math', 'history', 'geography', 'language'] as const;
export type LibraryTopic = (typeof LIBRARY_TOPICS)[number];

export function isLibraryTopic(v: unknown): v is LibraryTopic {
  return typeof v === 'string' && (LIBRARY_TOPICS as readonly string[]).includes(v);
}

export function isGradeBand(v: unknown): v is GradeBand {
  return typeof v === 'string' && (GRADE_BANDS as readonly string[]).includes(v);
}

export function defaultLibraryLanguage(locale: string): Language {
  return (EDUCATION_LANGUAGES as readonly string[]).includes(locale) ? (locale as Language) : 'en';
}

export type ModerationIssue = 'name' | 'description' | 'words' | 'empty';

function textHasBlocked(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.toLowerCase().split(/[\s,.;:!?()"'-]+/).some((t) => t && isBlockedWord(t));
}

/** Client-safe moderation (multilingual blocklist). The publish route adds an English profanity filter on top. */
export function listModerationIssues(list: {
  name: string;
  description: string | null;
  words: WordEntry[];
}): ModerationIssue[] {
  const issues: ModerationIssue[] = [];
  if (list.words.length === 0) return ['empty'];
  if (textHasBlocked(list.name)) issues.push('name');
  if (textHasBlocked(list.description)) issues.push('description');
  if (list.words.some((w) => textHasBlocked(w.word) || textHasBlocked(w.definition))) issues.push('words');
  return issues;
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safe = Math.min(Math.max(0, page), pageCount - 1);
  return { items: items.slice(safe * pageSize, safe * pageSize + pageSize), page: safe, pageCount };
}

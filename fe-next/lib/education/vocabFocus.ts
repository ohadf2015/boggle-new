/**
 * Vocabulary focus practice — pure question builder.
 *
 * A teacher enters per-word data (definition, synonyms, antonyms, an example
 * sentence with `___` for the blank) and can then target ONE skill:
 *
 *   definition — prompt: definition,        choices: lesson words
 *   synonym    — prompt: word,              choices: 1 true synonym + 3 synonyms of other words
 *   antonym    — prompt: word,              choices: 1 true antonym + 3 antonyms of other words
 *   context    — prompt: sentence w/ blank, choices: the word + 3 other lesson words
 *
 * Everything here is deterministic for a given seed so a question set can be
 * rebuilt (restart, tests) without storing it.
 */
import type { VocabularyWord } from '@/lib/supabase/education/types';

export type VocabFocus = 'definition' | 'synonym' | 'antonym' | 'context';
/** What a teacher can pin on an assignment. `any` = student picks. */
export type PracticeFocusSetting = VocabFocus | 'any';

export const VOCAB_FOCUSES: readonly VocabFocus[] = ['definition', 'synonym', 'antonym', 'context'];
export const PRACTICE_FOCUS_SETTINGS: readonly PracticeFocusSetting[] = ['any', ...VOCAB_FOCUSES];

/** A focus needs this many usable words before it can build 4-choice questions. */
export const MIN_WORDS_PER_FOCUS = 4;
export const CHOICES_PER_QUESTION = 4;
export const DEFAULT_QUESTION_COUNT = 10;
export const BLANK = '___';

export interface FocusQuestion {
  focus: VocabFocus;
  /** The lesson word this question is about. */
  word: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  /** `choices[answerIndex]` — convenience for feedback. */
  answer: string;
  /** Definition of `word`, shown in the feedback strip when available. */
  definition?: string;
}

export interface BuildOptions {
  count?: number;
  seed: number | string;
}

export interface LessonWordStats {
  total: number;
  withDefinitions: number;
  withSynonyms: number;
  withAntonyms: number;
  withExamples: number;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const cleanList = (list: unknown): string[] =>
  Array.isArray(list) ? list.map(clean).filter((s) => s.length > 0) : [];

export function isVocabFocus(value: unknown): value is VocabFocus {
  return typeof value === 'string' && (VOCAB_FOCUSES as readonly string[]).includes(value);
}

export function isPracticeFocusSetting(value: unknown): value is PracticeFocusSetting {
  return value === 'any' || isVocabFocus(value);
}

/** Whole-word, case-insensitive match of `word` inside `sentence`. */
function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b is Latin-only; fall back to lookarounds on whitespace/punctuation so
  // Hebrew/Japanese words still match.
  return new RegExp(`(^|[\\s"'(.,;:!?¿¡«»„“”‘’-])(${escaped})(?=$|[\\s"').,;:!?«»„“”‘’-])`, 'iu');
}

/**
 * Normalise an example sentence to contain the blank. Returns null when the
 * sentence neither has a `___` nor mentions the word.
 */
export function withBlank(example: string | undefined, word: string): string | null {
  const sentence = clean(example);
  if (!sentence) return null;
  if (sentence.includes(BLANK)) return sentence;
  const trimmedWord = clean(word);
  if (!trimmedWord) return null;
  const pattern = wordPattern(trimmedWord);
  if (!pattern.test(sentence)) return null;
  return sentence.replace(pattern, `$1${BLANK}`);
}

export function usableForFocus(word: VocabularyWord, focus: VocabFocus): boolean {
  if (!clean(word.word)) return false;
  switch (focus) {
    case 'definition':
      return clean(word.definition).length > 0;
    case 'synonym':
      return cleanList(word.synonyms).length > 0;
    case 'antonym':
      return cleanList(word.antonyms).length > 0;
    case 'context':
      return withBlank(word.example, word.word) !== null;
    default:
      return false;
  }
}

export function usableWords(words: VocabularyWord[], focus: VocabFocus): VocabularyWord[] {
  return words.filter((w) => usableForFocus(w, focus));
}

/** Focuses that have enough data to build a full 4-choice question set. */
export function availableFocuses(words: VocabularyWord[]): VocabFocus[] {
  return VOCAB_FOCUSES.filter((focus) => usableWords(words, focus).length >= MIN_WORDS_PER_FOCUS);
}

export function lessonWordStats(words: VocabularyWord[]): LessonWordStats {
  return {
    total: words.length,
    withDefinitions: words.filter((w) => clean(w.definition).length > 0).length,
    withSynonyms: words.filter((w) => cleanList(w.synonyms).length > 0).length,
    withAntonyms: words.filter((w) => cleanList(w.antonyms).length > 0).length,
    withExamples: words.filter((w) => clean(w.example).length > 0).length,
  };
}

// ---------------------------------------------------------------------------
// Seeded randomness (mulberry32) — deterministic per seed
// ---------------------------------------------------------------------------

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number | string): () => number {
  let a = hashSeed(seed) || 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/** Unique by lowercase, preserving first occurrence. */
function uniqueCi(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Question building
// ---------------------------------------------------------------------------

interface Draft {
  prompt: string;
  answer: string;
  /** Candidate distractors, already excluding anything that would be a second right answer. */
  pool: string[];
}

function draftFor(target: VocabularyWord, focus: VocabFocus, all: VocabularyWord[], rng: () => number): Draft | null {
  const others = all.filter((w) => w !== target && clean(w.word).length > 0);
  const targetWord = clean(target.word);
  const exclude = new Set<string>([targetWord.toLowerCase()]);

  switch (focus) {
    case 'definition': {
      const definition = clean(target.definition);
      if (!definition) return null;
      return { prompt: definition, answer: targetWord, pool: uniqueCi(others.map((w) => clean(w.word))) };
    }
    case 'context': {
      const prompt = withBlank(target.example, target.word);
      if (!prompt) return null;
      return { prompt, answer: targetWord, pool: uniqueCi(others.map((w) => clean(w.word))) };
    }
    case 'synonym':
    case 'antonym': {
      const key = focus === 'synonym' ? 'synonyms' : 'antonyms';
      const own = cleanList(target[key]);
      if (own.length === 0) return null;
      own.forEach((s) => exclude.add(s.toLowerCase()));
      const answer = pick(own, rng);
      const pool = uniqueCi(others.flatMap((w) => cleanList(w[key]))).filter((s) => !exclude.has(s.toLowerCase()));
      return { prompt: targetWord, answer, pool };
    }
    default:
      return null;
  }
}

/**
 * Build a deterministic set of 4-choice questions for one focus.
 * Returns [] when the lesson does not have enough usable words.
 */
export function buildFocusQuestions(
  words: VocabularyWord[],
  focus: VocabFocus,
  options: BuildOptions
): FocusQuestion[] {
  const usable = usableWords(words, focus);
  if (usable.length < MIN_WORDS_PER_FOCUS) return [];

  const rng = createRng(`${focus}:${String(options.seed)}`);
  const count = Math.min(options.count ?? DEFAULT_QUESTION_COUNT, usable.length);
  const order = shuffle(usable, rng);
  const questions: FocusQuestion[] = [];

  for (const target of order) {
    if (questions.length >= count) break;
    const draft = draftFor(target, focus, usable, rng);
    if (!draft) continue;
    const distractors = shuffle(draft.pool, rng).slice(0, CHOICES_PER_QUESTION - 1);
    if (distractors.length < CHOICES_PER_QUESTION - 1) continue;
    const choices = shuffle([draft.answer, ...distractors], rng);
    const definition = clean(target.definition) || undefined;
    questions.push({
      focus,
      word: clean(target.word),
      prompt: draft.prompt,
      choices,
      answerIndex: choices.indexOf(draft.answer),
      answer: draft.answer,
      definition,
    });
  }

  return questions;
}

// ---------------------------------------------------------------------------
// URL / assignment plumbing
// ---------------------------------------------------------------------------

export function parseFocusParam(value: string | null | undefined): VocabFocus | null {
  return isVocabFocus(value) ? value : null;
}

/**
 * Read `practice_focus` off any assignment-shaped row without depending on
 * the row's TypeScript type (lesson_assignments and teacher_assignments both
 * carry the column). `any`/missing → null.
 */
export function readAssignmentFocus(assignment: unknown): VocabFocus | null {
  if (!assignment || typeof assignment !== 'object') return null;
  return parseFocusParam((assignment as { practice_focus?: unknown }).practice_focus as string | undefined);
}

export function focusPracticeHref(locale: string, lessonId: string, focus: VocabFocus | null): string {
  const base = `/${locale}/student/lessons/${lessonId}?mode=vocab_focus`;
  return focus ? `${base}&focus=${focus}` : base;
}
